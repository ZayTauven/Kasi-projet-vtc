import { QueryService, UpdateOneOptions } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonCouponService } from '@kasi/coupon/common-coupon.service';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { RequestEntity } from '@kasi/database/request.entity';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'typeorm';

import { UpdateOrderInput } from './dto/update-order.input';
import { RiderOrderService } from './rider-order.service';

@QueryService(RequestEntity)
export class RiderOrderQueryService extends TypeOrmQueryService<RequestEntity> {
  constructor(
    @InjectRepository(RequestEntity)
    public orderRepository: Repository<RequestEntity>,
    private orderService: RiderOrderService,
    private commonCouponService: CommonCouponService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
  ) {
    super(orderRepository);
  }

  async updateOne(
    id: number,
    update: UpdateOrderInput,
    opts?: UpdateOneOptions<RequestEntity>,
  ): Promise<RequestEntity> {
    if (update.status === OrderStatus.RiderCanceled) {
      // p1-transitions (2026-09-29) : annulation conditionnelle et rejouable,
      // sur la course du client uniquement (filtre d'autorisation d'OrderDTO,
      // riderId = client connecte). Avant : le statut etait ecrit sans condition
      // (y compris sur une course payee) puis les frais preleves a chaque appel.
      const owned = await this.getById(id, opts);
      const result = await this.orderService.cancelOrder(
        Number(id),
        owned.riderId,
      );
      this.pubSub.publish('orderUpdated', { orderUpdated: result });
      return result;
    }
    let order = await this.orderRepository.findOne({
      where: { id },
      relations: { service: true, coupon: true },
    });
    if (update.couponCode != null) {
      await this.commonCouponService.applyCoupon(
        update.couponCode,
        id,
        order.riderId,
      );
    }
    delete update['couponCode'];
    order = await this.orderRepository.findOne({
      where: { id },
      relations: { service: true, coupon: true },
    });
    if (update.status != null) {
      throw new ForbiddenError('Update status to this is not possible');
    }
    let costAfterCoupon = order.costAfterCoupon;
    if (update.waitMinutes != null) {
      costAfterCoupon = this.commonCouponService.applyCouponOnPrice(
        order.coupon,
        order.costBest + order.service.perMinuteWait * update.waitMinutes,
      );
    }
    const result = await super.updateOne(id, { ...update, costAfterCoupon });
    this.pubSub.publish('orderUpdated', { orderUpdated: result });
    return result;
  }
}
