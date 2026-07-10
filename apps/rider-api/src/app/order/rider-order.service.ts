import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { HttpService } from '@nestjs/axios';
import { HttpServer, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverDeductTransactionType } from '@kasi/database/enums/driver-deduct-transaction-type.enum';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { PaymentStatus } from '@kasi/database/enums/payment-status.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RiderDeductTransactionType } from '@kasi/database/enums/rider-deduct-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { FeedbackEntity } from '@kasi/database/feedback.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { SharedProviderService } from '@kasi/order/shared-provider.service';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';

import { SubmitFeedbackInput } from './dto/submit-feedback.input';

@Injectable()
export class RiderOrderService {
  constructor(
    @InjectRepository(RequestEntity)
    private orderRepository: Repository<RequestEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    @InjectRepository(FeedbackEntity)
    private feedbackRepository: Repository<FeedbackEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    private riderService: SharedRiderService,
    private driverService: SharedDriverService,
    private orderRedisService: OrderRedisService,
    private providerService: SharedProviderService,
    @Inject(DRIVER_NOTIFICATION_SERVICE) private readonly driverNotificationService: IDriverNotificationService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    private httpService: HttpService,
  ) {}

  async getCurrentOrder(
    riderId: number,
    relations: string[] = [],
  ): Promise<RequestEntity | null> {
    return this.orderRepository.findOne({
      where: {
        riderId,
        status: In([
          OrderStatus.Requested,
          OrderStatus.Booked,
          OrderStatus.Found,
          OrderStatus.NotFound,
          OrderStatus.NoCloseFound,
          OrderStatus.DriverAccepted,
          OrderStatus.Arrived,
          OrderStatus.Started,
          OrderStatus.WaitingForReview,
          OrderStatus.WaitingForPrePay,
          OrderStatus.WaitingForPostPay,
        ]),
      },
      order: { id: 'DESC' },
      relations,
    });
  }

  async getLastOrder(riderId: number, relations: string[] = []) {
    return this.orderRepository.findOne({
      where: { riderId },
      order: { id: 'DESC' },
      relations,
    });
  }

  async cancelRiderLastOrder(riderId: number) {
    let order = await this.getCurrentOrder(riderId);
    return this.cancelOrder(order.id);
  }

  async cancelOrder(orderId: number): Promise<RequestEntity> {
    await this.orderRepository.update(orderId, {
      status: OrderStatus.RiderCanceled,
      finishTimestamp: new Date(),
      costAfterCoupon: 0,
    });
    const order = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: ['service', 'driver', 'rider'],
    });
    const payments = await this.paymentRepo.find({
      where: {
        userType: 'client',
        userId: order.riderId.toString(),
        status: PaymentStatus.Authorized,
        orderNumber: order.id.toString(),
      },
      order: { amount: 'DESC' },
    });
    if (order.driverId != null && order.service.cancellationTotalFee > 0) {
      const riderCredit = await this.riderService.getRiderCreditInCurrency(
        order.riderId,
        order.currency,
      );
      if (riderCredit < order.service.cancellationTotalFee) {
        await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/capture?id=${payments[0].transactionNumber}&amount=${order.service.cancellationTotalFee}`,
          ),
        );
      }
      await Promise.all([
        this.riderService.rechargeWallet({
          action: TransactionAction.Deduct,
          deductType: RiderDeductTransactionType.OrderFee,
          amount: -order.service.cancellationTotalFee,
          currency: order.currency,
          riderId: order.riderId,
          status: TransactionStatus.Done,
        }),
        this.driverService.rechargeWallet({
          action: TransactionAction.Deduct,
          deductType: DriverDeductTransactionType.Commission,
          amount: order.service.cancellationDriverShare,
          currency: order.currency,
          driverId: order.driverId,
          status: TransactionStatus.Done,
        }),
        this.providerService.rechargeWallet({
          action: TransactionAction.Recharge,
          rechargeType: ProviderRechargeTransactionType.Commission,
          amount:
            order.service.cancellationTotalFee -
            order.service.cancellationDriverShare,
          currency: order.currency,
        }),
      ]);
    }
    for (let payment of payments) {
      await firstValueFrom(
        this.httpService.get<{ status: 'OK' | 'FAILED' }>(
          `${process.env.GATEWAY_SERVER_URL}/cancel_preauth?id=${payment.transactionNumber}`,
        ),
      );
    }
    if (order.driverId == null) {
      this.pubSub.publish('orderRemoved', { orderRemoved: order });
      this.orderRedisService.expire([order.id]);
    } else {
      this.driverNotificationService.canceled(order.driver);
      await this.driverService.updateDriverStatus(
        order.driverId,
        DriverStatus.Online,
      );
      this.pubSub.publish('orderUpdated', { orderUpdated: order });
    }
    this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.CanceledByRider,
    });
    return order;
  }

  async submitReview(
    riderId: number,
    review: SubmitFeedbackInput,
  ): Promise<RequestEntity> {
    let order = await this.orderRepository.findOneBy({ id: review.requestId });
    if (order.riderId != riderId) {
      throw new ForbiddenError('Not Allowed');
    }
    const previousReview = await this.feedbackRepository.findOne({
      where: { requestId: order.id },
    });
    if (previousReview != null) {
      await this.feedbackRepository.delete(previousReview.id);
    }
    // if (order.reviewId != null) {
    //   await this.feedbackRepository.delete(order.reviewId!);
    // }
    await this.feedbackRepository.save({
      ...review,
      driverId: order.driverId,
      requestId: order.id,
      parameters: (review.parameterIds ?? []).map((id) => ({ id })),
    });
    this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.Reviewed,
    });
    let reviews = await this.feedbackRepository.find({
      where: { driverId: order.driverId },
    });
    let averageRating = Math.round(
      reviews.reduce((total, next) => total + next.score, 0) / reviews.length,
    );
    await this.driverService.setRating(
      order.driverId,
      averageRating,
      reviews.length,
    );
    await this.orderRepository.update(order.id, {
      status: OrderStatus.Finished,
    });
    order = await this.orderRepository.findOneBy({ id: review.requestId });
    return order;
  }
}
