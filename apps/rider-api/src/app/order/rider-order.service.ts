import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { HttpService } from '@nestjs/axios';
import { HttpServer, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverRechargeTransactionType } from '@kasi/database/enums/driver-recharge-transaction-type.enum';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { PaymentStatus } from '@kasi/database/enums/payment-status.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RiderDeductTransactionType } from '@kasi/database/enums/rider-deduct-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { DriverEntity } from '@kasi/database/driver.entity';
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
import {
  CallMaskingService,
  MaskedCallResult,
} from '@kasi/order/call-masking.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { relationsArrayToTree } from '@kasi/database';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import {
  transitionOrder,
  UNASSIGNED_STATUSES,
} from '@kasi/order/order-transition';
import { MoneyKey } from '@kasi/order/wallet-ledger';

import { SubmitFeedbackInput } from './dto/submit-feedback.input';

/**
 * Statuts d'ou le client peut annuler : offre ouverte, prepaiement attendu,
 * Kasiman en route, arrive, ou course demarree (l'app propose l'annulation
 * dans ces etats : main_bloc.dart, OrderLooking / OrderInProgress / OrderInvoice).
 */
export const RIDER_CANCELABLE_STATUSES: OrderStatus[] = [
  ...UNASSIGNED_STATUSES,
  OrderStatus.WaitingForPrePay,
  OrderStatus.DriverAccepted,
  OrderStatus.Arrived,
  OrderStatus.Started,
];

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
    private callMaskingService: CallMaskingService,
  ) {}

  // Ensemble EXACT des statuts « actifs » utilisé par getCurrentOrder : une
  // course doit être dans l'un d'eux pour qu'un appel masqué soit autorisé.
  private static readonly ACTIVE_ORDER_STATUSES = [
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
  ];

  // Appel masqué demandé par le RIDER pour joindre le driver de sa course.
  // Cœur sécurité : seul le rider participant d'une course active obtient un
  // numéro, et uniquement vers le driver de CETTE course.
  async requestMaskedCall(
    riderId: number,
    orderId: number,
  ): Promise<MaskedCallResult> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { rider: true, driver: true },
    });
    if (
      order == null ||
      !RiderOrderService.ACTIVE_ORDER_STATUSES.includes(order.status)
    ) {
      throw new Error('ORDER_NOT_ACTIVE');
    }
    if (order.riderId !== riderId) {
      throw new Error('CALL_MASKING_NOT_ALLOWED');
    }
    // Pas de contrepartie tant qu'aucun driver n'est assigné.
    if (order.driver == null || order.driver.mobileNumber == null) {
      throw new Error('CALL_MASKING_NOT_ALLOWED');
    }
    return this.callMaskingService.requestMaskedCall({
      order,
      callerMsisdn: order.rider.mobileNumber,
      targetMsisdn: order.driver.mobileNumber,
    });
  }

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
      relations: relationsArrayToTree(relations),
    });
  }

  async getLastOrder(riderId: number, relations: string[] = []) {
    return this.orderRepository.findOne({
      where: { riderId },
      order: { id: 'DESC' },
      relations: relationsArrayToTree(relations),
    });
  }

  async cancelRiderLastOrder(riderId: number) {
    const order = await this.getCurrentOrder(riderId);
    if (order == null) {
      // Rejeu d'une annulation deja faite (la course n'est plus « en cours ») :
      // on renvoie la course annulee au lieu d'une erreur illisible.
      const last = await this.getLastOrder(riderId);
      if (last?.status === OrderStatus.RiderCanceled) {
        return this.orderRepository.findOneOrFail({
          where: { id: last.id },
          relations: { service: true, driver: true, rider: true },
        });
      }
      throw new ForbiddenError('CANCEL_NOT_ALLOWED');
    }
    return this.cancelOrder(order.id, riderId);
  }

  /**
   * Annulation par le client (p1-transitions + p1-unicite, 2026-09-29).
   *
   * Ecriture conditionnelle depuis un statut annulable, pour la course de CE
   * client, et frais d'annulation dans la meme transaction, chacun avec sa cle
   * d'unicite : un rejeu (timeout, double appui) ne preleve plus deux fois.
   * Rejeu d'une course deja annulee par le client : renvoie la course, sans
   * effet. Course terminee, payee ou annulee par un autre : CANCEL_NOT_ALLOWED
   * (avant : la course etait reecrite en RiderCanceled quel que soit son
   * statut, y compris apres paiement).
   */
  async cancelOrder(orderId: number, riderId?: number): Promise<RequestEntity> {
    const before = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { service: true },
    });
    if (before == null || (riderId !== undefined && before.riderId !== riderId)) {
      throw new ForbiddenError('CANCEL_NOT_ALLOWED');
    }
    const payments = await this.paymentRepo.find({
      where: {
        userType: 'client',
        userId: before.riderId.toString(),
        status: PaymentStatus.Authorized,
        orderNumber: before.id.toString(),
      },
      order: { amount: 'DESC' },
    });
    const riderCreditBefore = await this.riderService.getRiderCreditInCurrency(
      before.riderId,
      before.currency,
    );
    const { changed, feeCharged } = await this.orderRepository.manager.transaction(
      async (manager) => {
        const changed = await transitionOrder(manager, orderId, {
          from: RIDER_CANCELABLE_STATUSES,
          to: OrderStatus.RiderCanceled,
          riderId: before.riderId,
          set: { finishTimestamp: new Date(), costAfterCoupon: 0 },
        });
        if (!changed) {
          return { changed: false, feeCharged: false };
        }
        const order = await manager
          .getRepository(RequestEntity)
          .findOneOrFail({ where: { id: orderId }, relations: { service: true } });
        await manager.insert(RequestActivityEntity, {
          requestId: order.id,
          type: RequestActivityType.CanceledByRider,
        });
        // Le Kasiman attribue est libere dans la MEME transaction que
        // l'annulation (avant : apres les appels passerelle ; une erreur la
        // laissait « in service », app bloquee sur « confirmer l'arrivee »).
        if (order.driverId != null) {
          await manager.update(DriverEntity, order.driverId, {
            status: DriverStatus.Online,
          });
        }
        if (order.driverId == null || !(order.service.cancellationTotalFee > 0)) {
          return { changed: true, feeCharged: false };
        }
        await this.riderService.rechargeWallet(
          {
            action: TransactionAction.Deduct,
            deductType: RiderDeductTransactionType.OrderFee,
            amount: -order.service.cancellationTotalFee,
            currency: order.currency,
            riderId: order.riderId,
            requestId: order.id,
            status: TransactionStatus.Done,
            idempotencyKey: MoneyKey.order(order.id, 'rider-cancel-fee'),
          },
          manager,
        );
        // p2-argent I1 (2026-10-19) : la part d'annulation est un GAIN du
        // Kasiman : `Recharge` / `OrderFee`, valeurs que driver-app connait
        // deja et affiche comme un gain (A7). Avant : `Deduct` / `Commission`
        // avec un montant positif, affiche sous le libelle « Commission ».
        // Cle inchangee : un rejeu reste absorbe.
        await this.driverService.rechargeWallet(
          {
            action: TransactionAction.Recharge,
            rechargeType: DriverRechargeTransactionType.OrderFee,
            amount: order.service.cancellationDriverShare,
            currency: order.currency,
            driverId: order.driverId,
            requestId: order.id,
            status: TransactionStatus.Done,
            idempotencyKey: MoneyKey.order(order.id, 'driver-cancel-share'),
          },
          manager,
        );
        await this.providerService.rechargeWallet(
          {
            action: TransactionAction.Recharge,
            rechargeType: ProviderRechargeTransactionType.Commission,
            amount:
              order.service.cancellationTotalFee -
              order.service.cancellationDriverShare,
            currency: order.currency,
            requestId: order.id,
            idempotencyKey: MoneyKey.order(order.id, 'provider-cancel-commission'),
          },
          manager,
        );
        return { changed: true, feeCharged: true };
      },
    );
    const order = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: { service: true, driver: true, rider: true },
    });
    if (!changed) {
      if (order.status === OrderStatus.RiderCanceled) {
        return order; // rejeu : deja annulee par ce client
      }
      throw new ForbiddenError('CANCEL_NOT_ALLOWED');
    }
    if (
      feeCharged &&
      riderCreditBefore < order.service.cancellationTotalFee &&
      payments.length > 0
    ) {
      await this.callGateway(
        `capture?id=${payments[0].transactionNumber}&amount=${order.service.cancellationTotalFee}`,
        order.id,
      );
    }
    for (const payment of payments) {
      await this.callGateway(
        `cancel_preauth?id=${payment.transactionNumber}`,
        order.id,
      );
    }
    if (order.driverId == null) {
      this.pubSub.publish('orderRemoved', { orderRemoved: order });
      await this.orderRedisService.expire([order.id]);
    } else {
      this.driverNotificationService.canceled(order.driver);
      this.pubSub.publish('orderUpdated', { orderUpdated: order });
    }
    // Course terminale (RiderCanceled) : purge les sessions de call masking.
    await this.safeEndCallMasking(order.id);
    return order;
  }

  // L'annulation est deja enregistree : un echec de la passerelle est journalise
  // sans faire croire au client que l'annulation a echoue.
  private async callGateway(path: string, orderId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get<{ status: 'OK' | 'FAILED' }>(
          `${process.env.GATEWAY_SERVER_URL}/${path}`,
        ),
      );
    } catch (error) {
      Logger.warn(
        `passerelle ${path.split('?')[0]} (course ${orderId}) : ${(error as Error).message}`,
        'RiderOrderService',
      );
    }
  }

  // Purge non bloquante des sessions de masquage à la fin d'une course.
  private async safeEndCallMasking(orderId: number): Promise<void> {
    try {
      await this.callMaskingService.endSession(orderId);
    } catch (error) {
      Logger.warn(
        `endSession failed for order ${orderId}: ${(error as Error).message}`,
        'RiderOrderService',
      );
    }
  }

  async submitReview(
    riderId: number,
    review: SubmitFeedbackInput,
  ): Promise<RequestEntity> {
    let order = await this.orderRepository.findOneBy({ id: review.requestId });
    if (order.riderId != riderId) {
      throw new ForbiddenError('Not Allowed');
    }
    // p1-transitions : un avis ne se depose que sur une course payee
    // (WaitingForReview) ou deja notee (Finished, l'avis est remplace). Avant,
    // il passait n'importe quelle course en Finished, y compris une course
    // en attente de paiement.
    if (
      order.status !== OrderStatus.WaitingForReview &&
      order.status !== OrderStatus.Finished
    ) {
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
    await this.activityRepository.insert({
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
    await transitionOrder(this.orderRepository, order.id, {
      from: [OrderStatus.WaitingForReview],
      to: OrderStatus.Finished,
      riderId,
    });
    // Course terminale (Finished) : purge les sessions de call masking.
    await this.safeEndCallMasking(order.id);
    order = await this.orderRepository.findOneBy({ id: review.requestId });
    return order;
  }
}
