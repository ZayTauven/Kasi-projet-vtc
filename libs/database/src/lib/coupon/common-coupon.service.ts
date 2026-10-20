import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CouponEntity } from '@kasi/database/coupon.entity';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { RequestEntity } from '@kasi/database/request.entity';
import { ForbiddenError } from '@nestjs/apollo';
import { In, Repository } from 'typeorm';

import { FARE_EDITABLE_STATUSES } from '../order/order-transition';

/**
 * p2-argent I1 (2026-10-19) : regles du coupon (docs/fiche-conception-argent.md
 * §1.6). Messages des nouveaux refus en francais : rider-app affiche tel quel le
 * message de l'erreur GraphQL (`getErrorMessage`, query_result_view.dart). Les
 * messages existants (« Incorrect code », « Coupon expired »...) sont gardes.
 * Qui finance la remise : Kasi (decision §8.6, 2026-10-20, p2-argent I4) ;
 * voir SharedOrderService.postFinishEntry (ligne KASI:PROMOTIONS).
 */
export const CouponRefusal = {
  NotStarted: "Ce coupon n'est pas encore valable.",
  FirstTravelOnly: 'Ce coupon est réservé à la première course.',
  ServiceNotAllowed: "Ce coupon ne s'applique pas à ce service.",
  BelowMinimum:
    'Le prix de cette course est inférieur au minimum requis par ce coupon.',
  AboveMaximum:
    'Le prix de cette course dépasse le maximum autorisé par ce coupon.',
  Frozen:
    'Le coupon ne peut plus être modifié après le démarrage de la course.',
} as const;

/** Courses que le client a terminees (pour `isFirstTravelOnly`). */
const COMPLETED_STATUSES = [OrderStatus.WaitingForReview, OrderStatus.Finished];

@Injectable()
export class CommonCouponService {
  constructor(
    @InjectRepository(CouponEntity)
    private couponRepo: Repository<CouponEntity>,
    @InjectRepository(RequestEntity)
    private requestRepo: Repository<RequestEntity>,
  ) {}

  /**
   * Prix apres coupon. p2-argent I1 : jamais negatif, arrondi au franc (le FCFA
   * n'a pas de centimes). Avant : `prix x (100 - %) / 100 - remise fixe`, sans
   * plancher ni arrondi (une remise fixe superieure au prix donnait un prix
   * negatif). Sans coupon : prix inchange.
   */
  applyCouponOnPrice(coupon: CouponEntity | null | undefined, price: number): number {
    if (coupon == null) return price;
    const discounted =
      (price * (100 - (coupon.discountPercent ?? 0))) / 100 -
      (coupon.discountFlat ?? 0);
    return Math.max(0, Math.round(discounted));
  }

  /**
   * Raison pour laquelle le coupon ne s'applique pas a cette course (service,
   * prix avant coupon), ou null s'il s'applique. p2-argent I1 :
   * - `allowedServices` : liste vide = tous les services ;
   * - `minimumCost` / `maximumCost` : bornes du prix avant coupon, 0 = pas de
   *   borne (valeur par defaut de la colonne).
   * `allowedServices` doit etre charge (checkCoupon le charge).
   */
  refusalForOrder(
    coupon: CouponEntity,
    serviceId: number,
    price: number,
  ): string | null {
    const allowed = coupon.allowedServices ?? [];
    if (allowed.length > 0 && !allowed.some((s) => s.id == serviceId)) {
      return CouponRefusal.ServiceNotAllowed;
    }
    if (coupon.minimumCost > 0 && price < coupon.minimumCost) {
      return CouponRefusal.BelowMinimum;
    }
    if (coupon.maximumCost > 0 && price > coupon.maximumCost) {
      return CouponRefusal.AboveMaximum;
    }
    return null;
  }

  /** Comme `refusalForOrder`, en levant l'erreur lisible. */
  assertAppliesToOrder(
    coupon: CouponEntity,
    serviceId: number,
    price: number,
  ): void {
    const refusal = this.refusalForOrder(coupon, serviceId, price);
    if (refusal != null) {
      throw new ForbiddenError(refusal);
    }
  }

  /**
   * p2-argent I1 : coupon reserve a la premiere course (`isFirstTravelOnly`) ;
   * refuse si le client a deja termine une course.
   */
  async assertFirstTravel(coupon: CouponEntity, riderId: number): Promise<void> {
    if (!coupon.isFirstTravelOnly) return;
    const completed = await this.requestRepo.count({
      where: { riderId, status: In(COMPLETED_STATUSES) },
    });
    if (completed > 0) {
      throw new ForbiddenError(CouponRefusal.FirstTravelOnly);
    }
  }

  /** p2-argent I4 : coupon d'un devis (revalide ensuite par checkCoupon). */
  async findById(id: number): Promise<CouponEntity> {
    return this.couponRepo.findOneOrFail({
      where: { id },
      relations: { allowedServices: true },
    });
  }

  async checkCoupon(code: string, riderId?: number): Promise<CouponEntity> {
    const coupon = await this.couponRepo.findOne({
      where: { code },
      relations: { allowedServices: true },
    });
    if (coupon == null) {
      throw new ForbiddenError('Incorrect code');
    }
    if (coupon.expireAt == null || coupon.expireAt < new Date()) {
      throw new ForbiddenError('Coupon expired');
    }
    // p2-argent I1 : date de debut (`startTimestamp`) enfin verifiee.
    if (coupon.startAt != null && coupon.startAt > new Date()) {
      throw new ForbiddenError(CouponRefusal.NotStarted);
    }
    if (riderId != null) {
      const requestsWithCoupon = await this.requestRepo.count({
        where: { riderId, couponId: coupon.id },
      });
      if (requestsWithCoupon >= coupon.manyTimesUserCanUse) {
        throw new ForbiddenError('Coupon already used.');
      }
      await this.assertFirstTravel(coupon, riderId);
    }

    if (!coupon.isEnabled) {
      throw new ForbiddenError('Coupon is disabled.');
    }
    const timesCouponUsed = await this.requestRepo.count({
      where: { couponId: coupon.id },
    });
    if (timesCouponUsed >= coupon.manyUsersCanUse) {
      throw new ForbiddenError('Coupon usage limit exceeded.');
    }
    return coupon;
  }

  /**
   * Coupon applique a une course existante. p2-argent I1 : regles du coupon
   * (service, bornes de prix, premiere course, date de debut) verifiees, et
   * ecriture CONDITIONNELLE au statut : refusee des que la course a demarre
   * (A3), y compris si le Kasiman demarre entre la lecture et l'ecriture.
   */
  async applyCoupon(
    code: string,
    orderId: number,
    riderId: number,
  ): Promise<RequestEntity> {
    let request = await this.requestRepo.findOneOrFail({
      where: { id: orderId },
      relations: { service: true },
    });
    if (!FARE_EDITABLE_STATUSES.includes(request.status)) {
      throw new ForbiddenError(CouponRefusal.Frozen);
    }
    const coupon = await this.checkCoupon(code, riderId);
    const basePrice =
      request.costBest + request.waitMinutes * request.service.perMinuteWait;
    this.assertAppliesToOrder(coupon, request.serviceId, basePrice);
    const finalCost = this.applyCouponOnPrice(coupon, basePrice);
    const result = await this.requestRepo
      .createQueryBuilder()
      .update(RequestEntity)
      .set({ couponId: coupon.id, costAfterCoupon: finalCost })
      .where('id = :orderId', { orderId: request.id })
      .andWhere('status IN (:...statuses)', {
        statuses: FARE_EDITABLE_STATUSES,
      })
      .execute();
    if ((result.affected ?? 0) === 0) {
      throw new ForbiddenError(CouponRefusal.Frozen);
    }
    request = await this.requestRepo.findOneOrFail({
      where: { id: orderId },
      relations: { service: true },
    });
    return request;
  }
}
