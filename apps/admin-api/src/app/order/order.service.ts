import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'typeorm';
import { ForbiddenError } from '@nestjs/apollo';
import {
  transitionOrder,
  UNASSIGNED_STATUSES,
} from '@kasi/order/order-transition';

/** Statuts d'ou un operateur peut annuler : tout sauf paye, termine ou annule. */
const OPERATOR_CANCELABLE_STATUSES: OrderStatus[] = [
  ...UNASSIGNED_STATUSES,
  OrderStatus.WaitingForPrePay,
  OrderStatus.DriverAccepted,
  OrderStatus.Arrived,
  OrderStatus.Started,
  OrderStatus.WaitingForPostPay,
];

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(RequestEntity)
    private orderRepository: Repository<RequestEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    private orderRedisService: OrderRedisService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
  ) {}

  /**
   * Annulation par un operateur (course passee en Expired).
   *
   * p1-transitions (2026-09-29) : ecriture conditionnelle. Refusee
   * (CANCEL_NOT_ALLOWED) sur une course payee, terminee ou deja annulee par le
   * client ou le Kasiman ; avant, elle reecrivait n'importe quelle course (prix
   * remis a 0 compris) et journalisait l'annulation avant de verifier quoi que
   * ce soit. Rejeu sur une course deja Expired : renvoyee sans effet.
   */
  async cancelOrder(orderId: number): Promise<RequestEntity> {
    const changed = await transitionOrder(this.orderRepository, orderId, {
      from: OPERATOR_CANCELABLE_STATUSES,
      to: OrderStatus.Expired,
      set: { finishTimestamp: new Date(), costAfterCoupon: 0 },
    });
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { service: true },
    });
    if (!changed) {
      if (order?.status === OrderStatus.Expired) {
        return order;
      }
      throw new ForbiddenError('CANCEL_NOT_ALLOWED');
    }
    await this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.CanceledByOperator,
    });
    await this.orderRedisService.expire([order.id]);
    this.pubSub.publish('orderRemoved', { orderRemoved: order });
    return order;
  }
}
