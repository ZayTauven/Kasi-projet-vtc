import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point } from '@kasi/database';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { packageSizeRank } from '@kasi/database/enums/package-size.enum';
import { ServiceOrderType } from '@kasi/database/enums/service-order-type.enum';
import { PaymentStatus } from '@kasi/database/enums/payment-status.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { DriverEntity } from '@kasi/database/driver.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { SharedFleetService } from '@kasi/order/shared-fleet.service';
import {
  CallMaskingService,
  MaskedCallResult,
} from '@kasi/order/call-masking.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import {
  transitionOrder,
  UNASSIGNED_STATUSES,
} from '@kasi/order/order-transition';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { blockedDebtCurrencies } from '@kasi/order/debt-limit';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(RequestEntity)
    public orderRepository: Repository<RequestEntity>,
    @InjectRepository(RequestActivityEntity)
    public activityRepository: Repository<RequestActivityEntity>,
    @InjectRepository(PaymentEntity)
    public paymentRepository: Repository<PaymentEntity>,
    private driverService: SharedDriverService,
    private orderRedisService: OrderRedisService,
    private sharedFleetService: SharedFleetService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    private httpService: HttpService,
    private callMaskingService: CallMaskingService,
  ) {}

  // Ensemble EXACT des statuts « actifs » utilisé par getCurrentOrder
  // (rider-api) : une course doit être dans l'un d'eux pour qu'un appel masqué
  // soit autorisé.
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

  // Appel masqué demandé par le DRIVER pour joindre le rider de sa course.
  // Cœur sécurité : seul le driver participant d'une course active obtient un
  // numéro, et uniquement vers le rider de CETTE course.
  async requestMaskedCall(
    driverId: number,
    orderId: number,
  ): Promise<MaskedCallResult> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { rider: true, driver: true },
    });
    if (
      order == null ||
      !OrderService.ACTIVE_ORDER_STATUSES.includes(order.status)
    ) {
      throw new Error('ORDER_NOT_ACTIVE');
    }
    if (order.driverId == null || order.driverId !== driverId) {
      throw new Error('CALL_MASKING_NOT_ALLOWED');
    }
    if (order.rider == null || order.rider.mobileNumber == null) {
      throw new Error('CALL_MASKING_NOT_ALLOWED');
    }
    return this.callMaskingService.requestMaskedCall({
      order,
      callerMsisdn: order.driver.mobileNumber,
      targetMsisdn: order.rider.mobileNumber,
    });
  }

  // Purge non bloquante des sessions de masquage à la fin d'une course.
  private async safeEndCallMasking(orderId: number): Promise<void> {
    try {
      await this.callMaskingService.endSession(orderId);
    } catch (error) {
      Logger.warn(
        `endSession failed for order ${orderId}: ${(error as Error).message}`,
        'OrderService',
      );
    }
  }

  /**
   * Annulation par le Kasiman (p1-transitions, bug-annulation).
   *
   * Ecriture conditionnelle : DriverAccepted/Arrived -> DriverCanceled, et
   * seulement pour la course de CE Kasiman. `changed = false` signale un rejeu
   * (course deja annulee par lui) : aucun effet de bord, pas d'erreur.
   * Toute autre situation leve CANCEL_NOT_ALLOWED (message deja traduit par
   * driver-app, ride_options_sheet_view.dart).
   */
  async cancelOrder(
    orderId: number,
    driverId?: number,
  ): Promise<{ order: RequestEntity; changed: boolean }> {
    // Statut de la course, activite et remise en ligne du Kasiman dans UNE
    // transaction : jamais d'annulation enregistree avec un Kasiman encore
    // « in service ».
    const changed = await this.orderRepository.manager.transaction(
      async (manager) => {
        const changed = await transitionOrder(manager, orderId, {
          from: [OrderStatus.DriverAccepted, OrderStatus.Arrived],
          to: OrderStatus.DriverCanceled,
          driverId,
          set: { finishTimestamp: new Date(), costAfterCoupon: 0 },
        });
        if (changed) {
          const canceled = await manager.findOneByOrFail(RequestEntity, {
            id: orderId,
          });
          await manager.insert(RequestActivityEntity, {
            requestId: orderId,
            type: RequestActivityType.CanceledByDriver,
          });
          await manager.update(DriverEntity, canceled.driverId, {
            status: DriverStatus.Online,
          });
        }
        return changed;
      },
    );
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!changed) {
      if (
        order != null &&
        order.status === OrderStatus.DriverCanceled &&
        (driverId === undefined || order.driverId === driverId)
      ) {
        return { order, changed: false };
      }
      throw new ForbiddenError('CANCEL_NOT_ALLOWED');
    }
    const payments = await this.paymentRepository.find({
      where: {
        userType: 'client',
        userId: order.riderId.toString(),
        status: PaymentStatus.Authorized,
        orderNumber: order.id.toString(),
      },
      order: { id: 'DESC' },
    });
    for (const payment of payments) {
      // L'annulation est deja enregistree : un echec de la passerelle ne doit
      // pas faire croire au Kasiman qu'elle a echoue.
      try {
        await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/cancel_preauth?id=${payment.transactionNumber}`,
          ),
        );
      } catch (error) {
        Logger.warn(
          `cancel_preauth ${payment.transactionNumber} (course ${order.id}) : ${(error as Error).message}`,
          'OrderService',
        );
      }
    }
    // Course terminale (DriverCanceled) : purge les sessions de call masking.
    await this.safeEndCallMasking(order.id);
    return { order, changed: true };
  }

  /**
   * Expiration des offres non prises (cron). Conditionnelle depuis le
   * 2026-09-29 (p1-transitions) : une course acceptee entre la lecture de
   * Redis et l'ecriture n'est plus ecrasee en Expired, et l'activite n'est
   * journalisee que pour les courses reellement expirees.
   */
  async expireOrders(orderIds: number[]): Promise<number[]> {
    await this.orderRedisService.expire(orderIds);
    if (orderIds.length === 0) {
      return [];
    }
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(RequestEntity)
      .set({ status: OrderStatus.Expired })
      .where('id IN (:...orderIds)', { orderIds })
      .andWhere('status IN (:...fromStatuses)', {
        fromStatuses: [...UNASSIGNED_STATUSES, OrderStatus.WaitingForPrePay],
      })
      .returning('id')
      .execute();
    const expiredIds: number[] = (
      Array.isArray(result.raw) ? result.raw : []
    ).map((row: { id: number }) => row.id);
    for (const requestId of expiredIds) {
      await this.activityRepository.insert({
        requestId,
        type: RequestActivityType.Expired,
      });
      // Course terminale (Expired) : purge les sessions de call masking.
      await this.safeEndCallMasking(requestId);
    }
    return expiredIds;
  }

  async getOrdersForDriver(driverId: number): Promise<RequestEntity[]> {
    const driver = await this.driverService.driverRepo.findOneOrFail({
      where: { id: driverId },
      relations: {
        enabledServices: true,
      },
    });
    Logger.log(`getting orders for driver ${JSON.stringify(driver)}`);
    const orderIds = (
      await this.orderRedisService.getForDriver(driverId, driver.searchDistance)
    ).map((id) => parseInt(id));
    Logger.log(`got order ids ${JSON.stringify(orderIds)}`);
    let orders = await this.orderRepository.find({
      where: {
        id: In(orderIds),
        serviceId: In(driver.enabledServices.map((service) => service.id)),
        status: In([
          OrderStatus.NoCloseFound,
          OrderStatus.NoCloseFound,
          OrderStatus.Found,
          OrderStatus.Booked,
          OrderStatus.Requested,
        ]),
      },
      relations: { service: true, options: true },
    });
    Logger.log(`got orders ${JSON.stringify(orders)}`);
    orders = orders.filter(
      (order) =>
        order.service.orderType !== ServiceOrderType.Delivery ||
        (driver.canDeliver &&
          packageSizeRank(driver.maxPackageSize) >=
            packageSizeRank(order.packageSize)),
    );
    for (let order of orders) {
      const fleetIds = await this.sharedFleetService.getFleetIdsInPoint(
        order.points[0],
      );
      if (
        fleetIds.length > 0 &&
        (!fleetIds.includes(driver.fleetId) || driver.fleetId == null)
      ) {
        orders = orders.filter((_order) => _order.id != order.id);
      }
    }
    Logger.log(
      `got filtered orders by fleet criteria ${JSON.stringify(orders)}`,
    );
    // p2-argent I3 (2026-10-19, fiche argent §4.2) : au-dela du plafond de
    // dette, plus aucune offre (liste vide dans la devise bloquee). Filtre
    // seulement : le controle qui fait foi est a l'acceptation.
    if (orders.length > 0) {
      const blocked = await blockedDebtCurrencies(
        this.orderRepository.manager,
        driverId,
      );
      if (blocked.size > 0) {
        orders = orders.filter((order) => !blocked.has(order.currency));
      }
    }

    return orders;
  }
}
