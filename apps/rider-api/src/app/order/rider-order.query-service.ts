import { QueryService, UpdateOneOptions } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonCouponService, CouponRefusal } from '@kasi/coupon/common-coupon.service';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  FARE_EDITABLE_STATUSES,
  TIP_EDITABLE_STATUSES,
} from '@kasi/order/order-transition';
import { roundFcfa } from '@kasi/order/ledger';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'typeorm';

import { UpdateOrderInput } from './dto/update-order.input';
import { RiderOrderService } from './rider-order.service';

/**
 * p2-argent I1 (2026-10-19) : refus lisibles de updateOneOrder (rider-app
 * affiche tel quel le message de l'erreur GraphQL).
 */
export const RiderOrderUpdateRefusal = {
  NegativeTip: 'Le pourboire ne peut pas être négatif.',
  TipFrozen: 'Le pourboire ne peut plus être modifié pour cette course.',
  NegativeWait: "Le temps d'attente ne peut pas être négatif.",
  WaitFrozen:
    "Le temps d'attente ne peut plus être modifié après le démarrage de la course.",
  CouponFrozen: CouponRefusal.Frozen,
} as const;

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
      // rider-app envoie aussi `tipAmount: 0, waitMinutes: 0` : ignores ici.
      const owned = await this.getById(id, opts);
      const result = await this.orderService.cancelOrder(
        Number(id),
        owned.riderId,
      );
      this.pubSub.publish('orderUpdated', { orderUpdated: result });
      return result;
    }
    // p2-argent I1 (2026-10-19) : tout est verifie AVANT la moindre ecriture.
    // Avant : le coupon etait applique, puis le statut demande refuse ; les
    // autres champs etaient ecrits sans controle (pourboire negatif, attente et
    // coupon apres le demarrage), et sans le filtre d'autorisation (course d'un
    // autre client).
    if (update.status != null) {
      throw new ForbiddenError('Update status to this is not possible');
    }
    const owned = await this.getById(id, opts);
    let order = await this.orderRepository.findOneOrFail({
      where: { id: owned.id },
      relations: { service: true, coupon: true },
    });
    const tipChanged =
      update.tipAmount != null && update.tipAmount != order.tipAmount;
    const waitChanged =
      update.waitMinutes != null && update.waitMinutes != order.waitMinutes;
    if (update.tipAmount != null) {
      if (!Number.isFinite(update.tipAmount) || update.tipAmount < 0) {
        throw new ForbiddenError(RiderOrderUpdateRefusal.NegativeTip);
      }
      if (tipChanged && !TIP_EDITABLE_STATUSES.includes(order.status)) {
        throw new ForbiddenError(RiderOrderUpdateRefusal.TipFrozen);
      }
    }
    if (update.waitMinutes != null) {
      if (update.waitMinutes < 0) {
        throw new ForbiddenError(RiderOrderUpdateRefusal.NegativeWait);
      }
      if (waitChanged && !FARE_EDITABLE_STATUSES.includes(order.status)) {
        throw new ForbiddenError(RiderOrderUpdateRefusal.WaitFrozen);
      }
    }
    if (
      update.couponCode != null &&
      !FARE_EDITABLE_STATUSES.includes(order.status)
    ) {
      throw new ForbiddenError(RiderOrderUpdateRefusal.CouponFrozen);
    }
    if (update.couponCode != null) {
      // Regles du coupon et ecriture conditionnelle au statut.
      await this.commonCouponService.applyCoupon(
        update.couponCode,
        order.id,
        order.riderId,
      );
      order = await this.orderRepository.findOneOrFail({
        where: { id: order.id },
        relations: { service: true, coupon: true },
      });
    }
    const set: Partial<RequestEntity> = {};
    if (tipChanged) {
      set.tipAmount = update.tipAmount;
    }
    if (waitChanged) {
      set.waitMinutes = update.waitMinutes;
      // p2-argent I4 (2026-10-20) : prix toujours entier au franc, coupon ou non.
      set.costAfterCoupon = Math.max(
        0,
        roundFcfa(
          this.commonCouponService.applyCouponOnPrice(
            order.coupon,
            order.costBest + order.service.perMinuteWait * update.waitMinutes!,
          ),
        ),
      );
    }
    if (Object.keys(set).length > 0) {
      // Ecriture conditionnelle : si le Kasiman demarre (ou encaisse) entre la
      // lecture et l'ecriture, rien n'est ecrit et le refus est renvoye.
      const allowed = waitChanged
        ? FARE_EDITABLE_STATUSES
        : TIP_EDITABLE_STATUSES;
      const written = await this.orderRepository
        .createQueryBuilder()
        .update(RequestEntity)
        .set(set)
        .where('id = :orderId', { orderId: order.id })
        .andWhere('status IN (:...statuses)', { statuses: allowed })
        .execute();
      if ((written.affected ?? 0) === 0) {
        throw new ForbiddenError(
          waitChanged
            ? RiderOrderUpdateRefusal.WaitFrozen
            : RiderOrderUpdateRefusal.TipFrozen,
        );
      }
    }
    const result = await this.orderRepository.findOneOrFail({
      where: { id: order.id },
    });
    this.pubSub.publish('orderUpdated', { orderUpdated: result });
    return result;
  }
}
