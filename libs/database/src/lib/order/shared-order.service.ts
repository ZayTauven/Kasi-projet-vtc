import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonCouponService } from '@kasi/coupon/common-coupon.service';
import { CouponEntity } from '@kasi/database/coupon.entity';
import { DriverDeductTransactionType } from '@kasi/database/enums/driver-deduct-transaction-type.enum';
import { DriverRechargeTransactionType } from '@kasi/database/enums/driver-recharge-transaction-type.enum';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { PaymentStatus } from '@kasi/database/enums/payment-status.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RiderDeductTransactionType } from '@kasi/database/enums/rider-deduct-transaction-type.enum';
import { ServiceOptionType } from '@kasi/database/enums/service-option-type.enum';
import { ServicePaymentMethod } from '@kasi/database/enums/service-payment-method.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { ServiceOptionEntity } from '@kasi/database/service-option.entity';
import { ZonePriceEntity } from '@kasi/database/zone-price.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EntityManager, In, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { OrderStatus } from '../entities/enums/order-status.enum';
import { PackageSize } from '../entities/enums/package-size.enum';
import { RequestEntity } from '../entities/request.entity';
import { ServiceCategoryEntity } from '../entities/service-category.entity';
import { DriverEntity } from '../entities/driver.entity';
import { Point } from '../interfaces/point';
import {
  DriverLocationWithId,
  DriverRedisService,
} from '../redis/driver-redis.service';
import { OrderRedisService } from '../redis/order-redis.service';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from './interfaces/driver-notification.interface';
import {
  RIDER_NOTIFICATION_SERVICE,
  IRiderNotificationService,
} from './interfaces/rider-notification.interface';
import { GoogleServicesService } from './google-services/google-services.service';
import { RoutingService } from './routing/routing.service';
import { RegionService } from './region/region.service';
import { ServiceService } from './service.service';
import { SharedDriverService } from './shared-driver.service';
import { SharedFleetService } from './shared-fleet.service';
import { SharedProviderService } from './shared-provider.service';
import { SharedRiderService } from './shared-rider.service';
import { firstValueFrom } from 'rxjs';
import { ForbiddenError } from '@nestjs/apollo';
import { transitionOrder, UNASSIGNED_STATUSES } from './order-transition';
import { MoneyKey } from './wallet-ledger';
import { DebtCrossing, sendDebtCrossingPush, watchDebtCrossing } from './debt-limit';
import { FareQuoteEntity } from '../entities/fare-quote.entity';
import {
  FARE_QUOTE_PICKUP_TOLERANCE_MINUTES,
  fareQuoteError,
  FareQuoteRefusal,
  FareQuoteService,
  hashPoints,
  normalizeOptionIds,
} from './fare-quote.service';
import {
  LedgerAccounts,
  LedgerEntryNature,
  LedgerLineInput,
  LedgerLineNature,
  LedgerWalletLineInput,
  postLedgerEntry,
  roundFcfa,
  splitCommission,
} from './ledger';
import { firstWaveDelayMs, isWavesMode } from './dispatch-config';
import { DispatchProducer } from './dispatch-producer.service';

/**
 * bug-timeout : la course existe deja (envoi simultane de la meme commande) ;
 * leve dans la transaction pour l'annuler, capte juste apres.
 */
class ResentOrder extends Error {
  constructor(readonly orderId: number) {
    super('RESENT_ORDER');
  }
}

/** Course close : une commande identique est une nouvelle course, pas un renvoi. */
const CLOSED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.RiderCanceled,
  OrderStatus.DriverCanceled,
  OrderStatus.Expired,
  OrderStatus.NotFound,
  OrderStatus.WaitingForReview,
  OrderStatus.Finished,
];

@Injectable()
export class SharedOrderService {
  constructor(
    @InjectRepository(RequestEntity)
    private orderRepository: Repository<RequestEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    private regionService: RegionService,
    @InjectRepository(ServiceCategoryEntity)
    private serviceCategoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceOptionEntity)
    private serviceOptionRepository: Repository<ServiceOptionEntity>,
    @InjectRepository(ZonePriceEntity)
    private zonePriceRepository: Repository<ZonePriceEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    private googleServices: GoogleServicesService,
    private routingService: RoutingService,
    private servicesService: ServiceService,
    private riderService: SharedRiderService,
    private driverRedisService: DriverRedisService,
    private orderRedisService: OrderRedisService,
    private driverService: SharedDriverService,
    private sharedProviderService: SharedProviderService,
    private sharedFleetService: SharedFleetService,
    private commonCouponService: CommonCouponService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    @Inject(DRIVER_NOTIFICATION_SERVICE) private readonly driverNotificationService: IDriverNotificationService,
    @Inject(RIDER_NOTIFICATION_SERVICE) private readonly riderNotificationService: IRiderNotificationService,
    private httpService: HttpService,
    // p2-argent I4 (2026-10-20) : devis fige, seul calcul de prix.
    private fareQuoteService: FareQuoteService,
    // p2-dispatch D2 (2026-10-20) : vagues produites ici, consommees par driver-api.
    private dispatchProducer: DispatchProducer,
  ) {}

  /**
   * bug-timeout : la course `requestId` si la commande est un renvoi de ce
   * client (meme course, encore en cours) ; null sinon.
   */
  private async resentOrder(
    requestId: number | null | undefined,
    riderId: number | null | undefined,
  ): Promise<RequestEntity | null> {
    if (requestId == null || riderId == null) return null;
    const order = await this.orderRepository.findOneBy({ id: Number(requestId) });
    if (
      order == null ||
      Number(order.riderId) !== Number(riderId) ||
      CLOSED_ORDER_STATUSES.includes(order.status)
    ) {
      return null;
    }
    Logger.log(`commande renvoyee : course ${order.id} rendue (client ${riderId})`, 'FareQuote');
    return order;
  }

  /**
   * p2-dispatch D2 : en `DISPATCH_MODE=waves`, la course part en vagues (job
   * BullMQ, consommateur driver-api) au lieu d'etre diffusee d'un coup. File
   * injoignable : repli sur la diffusion d'aujourd'hui (renvoie `false`).
   */
  private async dispatchInWaves(
    orderId: number,
    pickupAt: Date | null | undefined,
  ): Promise<boolean> {
    try {
      await this.dispatchProducer.dispatchOrder(orderId, firstWaveDelayMs(pickupAt));
      return true;
    } catch (error) {
      Logger.error(
        `Course ${orderId} : file de dispatch injoignable, diffusion classique (${(error as Error).message}).`,
        SharedOrderService.name,
      );
      return false;
    }
  }

  /**
   * Apercu du prix (getFare et calculateFare de rider-api, calculateFare du
   * dispatcher d'admin-api). p2-argent I4 (2026-10-20) : un seul calcul,
   * FareQuoteService (fiche argent §5.1). `persist` : devis enregistres et
   * renvoyes (`quoteId`, `quoteExpiresAt`) ; false pour le back-office.
   */
  async calculateFare(input: {
    points: Point[];
    twoWay?: boolean;
    coupon?: CouponEntity;
    riderId?: number;
    selectedOptionIds?: string[];
    intervalMinutes?: number;
    persist?: boolean;
  }) {
    const pickupAt = new Date(Date.now() + (Number(input.intervalMinutes ?? 0) | 0) * 60 * 1000);
    const preview = await this.fareQuoteService.preview(
      {
        points: input.points,
        twoWay: input.twoWay ?? false,
        coupon: input.coupon ?? null,
        riderId: input.riderId ?? null,
        optionIds: input.selectedOptionIds ?? [],
        pickupAt,
      },
      input.persist ?? false,
    );
    return {
      distance: preview.distance,
      duration: preview.duration,
      directions: preview.directions,
      currency: preview.currency,
      services: preview.categories.map(({ category, services }) => {
        const { services: _all, ...cat } = category;
        void _all;
        return {
          ...cat,
          services: services.map(({ service, quote }) => ({
            ...service,
            cost: quote.totalBeforeCoupon,
            ...(quote.couponId != null ? { costAfterCoupon: quote.total } : {}),
            ...(input.persist
              ? { quoteId: quote.id, quoteExpiresAt: quote.expiresAt }
              : {}),
          })),
        };
      }),
    };
  }

  /**
   * Commande. p2-argent I4 (2026-10-20) : le prix vient d'un devis
   * (fiche argent §5.3), consomme dans la meme transaction que la course :
   * - `quoteId` (nouvelle rider-app) : ce devis, s'il correspond a la commande
   *   et n'a pas expire (2 min) ; sinon refus QUOTE_EXPIRED / QUOTE_MISMATCH /
   *   QUOTE_ALREADY_USED ;
   * - sans `quoteId` (rider-app installee) : dernier devis du meme client pour
   *   ce service, ces points et ces options, de moins de 10 min, coupon
   *   compris ; pas trouve : devis calcule a la commande (origine `commande`,
   *   mesure « devis recalcule ») ;
   * - back-office : devis calcule a la commande.
   * `costBest` = prix avant coupon, `costAfterCoupon` = prix du devis.
   * Renvoi de la meme commande par l'app (timeout de 20 s, bug-timeout) :
   * meme devis, ou meme trajet moins de 2 min apres pour l'app installee, et
   * course encore en cours = cette course est renvoyee telle quelle, sans
   * nouvelle course ni nouveau dispatch (banc pilote, 2026-10-20).
   */
  async createOrder(input: {
    riderId?: number;
    serviceId: number;
    intervalMinutes: number;
    points: Point[];
    addresses: string[];
    operatorId?: number;
    twoWay?: boolean;
    optionIds?: string[];
    couponCode?: string;
    quoteId?: string;
    fleetId?: number;
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
  }): Promise<RequestEntity> {
    const service = await this.servicesService.getWithId(input.serviceId);
    if (service == undefined) {
      throw new ForbiddenError('SERVICE_NOT_FOUND');
    }
    const rawPoints: Point[] = input.points.map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
    }));
    const regions = await this.regionService.getRegionWithPoint(rawPoints[0]);
    if (regions.length < 1) {
      throw fareQuoteError(FareQuoteRefusal.RegionUnsupported);
    }
    const currency = regions[0].currency;
    const rider =
      input.riderId == null ? null : await this.riderService.findById(input.riderId);
    const eta = new Date(Date.now() + (input.intervalMinutes | 0) * 60 * 1000);
    const options = await this.fareQuoteService.optionsForService(
      input.serviceId,
      input.optionIds,
    );
    const optionIds = normalizeOptionIds(options.map((o) => o.id));
    const twoWay =
      (input.twoWay ?? false) || options.some((o) => o.type == ServiceOptionType.TwoWay);
    // Coupon saisi a la commande : regles du coupon (I1) avant toute ecriture.
    const explicitCoupon =
      input.couponCode != null && input.couponCode != '' && rider != null
        ? await this.commonCouponService.checkCoupon(input.couponCode, rider.id)
        : null;

    let quote: FareQuoteEntity | null = null;
    let mode: 'quote' | 'installed-app' | 'new' = 'new';
    let directions: Point[] | null = null;
    if (input.quoteId != null && input.quoteId !== '') {
      quote = await this.fareQuoteService.findById(input.quoteId);
      if (quote == null) {
        throw fareQuoteError(FareQuoteRefusal.Expired);
      }
      if (quote.consumedAt != null) {
        // bug-timeout : le meme devis renvoye par le meme client = la meme course.
        const resent = await this.resentOrder(quote.requestId, input.riderId);
        if (resent != null) return resent;
        throw fareQuoteError(FareQuoteRefusal.AlreadyUsed);
      }
      const pickupGap = Math.abs(new Date(quote.pickupAt).getTime() - eta.getTime());
      if (
        (quote.riderId != null && Number(quote.riderId) !== Number(input.riderId)) ||
        Number(quote.serviceId) !== Number(input.serviceId) ||
        quote.pointsHash !== hashPoints(rawPoints) ||
        normalizeOptionIds(quote.optionIds).join(',') !== optionIds.join(',') ||
        quote.twoWay !== twoWay ||
        pickupGap > FARE_QUOTE_PICKUP_TOLERANCE_MINUTES * 60 * 1000
      ) {
        throw fareQuoteError(FareQuoteRefusal.Mismatch);
      }
      if (explicitCoupon != null && quote.couponId !== explicitCoupon.id) {
        const refusal = this.commonCouponService.refusalForOrder(
          explicitCoupon,
          input.serviceId,
          quote.totalBeforeCoupon,
        );
        throw refusal != null
          ? new ForbiddenError(refusal)
          : fareQuoteError(FareQuoteRefusal.Mismatch);
      }
      mode = 'quote';
    } else if (rider != null && input.operatorId == null) {
      // bug-timeout (banc pilote, 2026-10-20) : l'app installee renvoie la
      // commande quand la reponse tarde (20 s). Son devis etant consomme, le
      // renvoi en recalculait un et creait une seconde course. Le renvoi est
      // cherche AVANT un devis libre : un apercu plus ancien du meme trajet
      // (client qui a consulte le prix deux fois) aurait sinon servi a creer
      // la seconde course.
      const resentId = await this.fareQuoteService.findResentOrderId({
        riderId: rider.id,
        serviceId: input.serviceId,
        points: rawPoints,
        optionIds,
        twoWay,
      });
      const resent = await this.resentOrder(resentId, rider.id);
      if (resent != null) return resent;
      quote = await this.fareQuoteService.findForInstalledApp({
        riderId: rider.id,
        serviceId: input.serviceId,
        points: rawPoints,
        optionIds,
        twoWay,
        couponId: explicitCoupon?.id ?? null,
      });
      if (quote != null) {
        mode = 'installed-app';
      }
    }
    if (quote == null) {
      const computed = await this.fareQuoteService.computeForOrder(
        input.serviceId,
        {
          points: rawPoints,
          optionIds,
          coupon: explicitCoupon,
          riderId: input.riderId ?? null,
          pickupAt: eta,
          twoWay,
        },
        currency,
      );
      quote = computed.quote;
      directions = computed.directions;
      if (explicitCoupon != null) {
        // Coupon saisi qui ne s'applique pas a cette course : refus lisible (I1).
        this.commonCouponService.assertAppliesToOrder(
          explicitCoupon,
          input.serviceId,
          quote.totalBeforeCoupon,
        );
      }
      if (rider != null && input.operatorId == null) {
        Logger.log(
          `devis recalcule a la commande (client ${rider.id}, service ${input.serviceId})`,
          'FareQuote',
        );
      }
    } else if (quote.couponId != null && rider != null) {
      // Devis avec coupon : le coupon est revalide (limites d'usage, dates).
      const coupon = await this.commonCouponService.findById(quote.couponId);
      const checked = await this.commonCouponService.checkCoupon(coupon.code, rider.id);
      this.commonCouponService.assertAppliesToOrder(
        checked,
        input.serviceId,
        quote.totalBeforeCoupon,
      );
    }
    if (
      service.maximumDestinationDistance != 0 &&
      quote.distance > service.maximumDestinationDistance
    ) {
      throw new ForbiddenError('DISTANCE_TOO_FAR');
    }
    const routePoints = twoWay ? [...rawPoints, rawPoints[0]] : rawPoints;
    if (directions == null) {
      // Trace pour la carte seulement : le prix et la distance sont ceux du devis.
      directions =
        quote.distance > 0
          ? (await this.routingService.getSumDistanceAndDuration(routePoints)).directions
          : [];
    }

    const closeDrivers = await this.driverRedisService.getClose(
      rawPoints[0],
      service.searchRadius,
    );
    const driverIds = closeDrivers.map((x: DriverLocationWithId) => x.driverId);
    const fleetIdsInPoint = await this.sharedFleetService.getFleetIdsInPoint(rawPoints[0]);
    const driversWithService = await this.driverService.getOnlineDriversWithServiceId(
      driverIds,
      input.serviceId,
      fleetIdsInPoint,
      { service, packageSize: input.packageSize },
    );
    let shouldPrePay = false;
    if (service.prepayPercent > 0 && input.riderId != null) {
      const balance = await this.riderService.getRiderCreditInCurrency(
        input.riderId,
        currency,
      );
      if (balance < (quote.total * service.prepayPercent) / 100) {
        shouldPrePay = true;
      }
    }
    let activityType: RequestActivityType;
    if (input.intervalMinutes > 0) {
      activityType =
        input.operatorId == null
          ? RequestActivityType.BookedByRider
          : RequestActivityType.BookedByOperator;
    } else {
      activityType =
        input.operatorId == null
          ? RequestActivityType.RequestedByRider
          : RequestActivityType.RequestedByOperator;
    }
    const finalQuote = quote;
    let order: RequestEntity;
    try {
      order = await this.orderRepository.manager.transaction(
        async (manager) => {
          if (mode === 'new') {
            await this.fareQuoteService.insertQuotes(manager, [finalQuote]);
          }
          const saved = await manager.getRepository(RequestEntity).save({
            serviceId: input.serviceId,
            currency,
            riderId: input.riderId,
            points: routePoints,
            addresses: input.addresses.map((address) => address.replace(', ', '-')),
            distanceBest: finalQuote.distance,
            durationBest: finalQuote.duration,
            directions: directions ?? [],
            status: shouldPrePay
              ? OrderStatus.WaitingForPrePay
              : input.intervalMinutes > 30
                ? OrderStatus.Booked
                : driversWithService.length < 1
                  ? OrderStatus.NoCloseFound
                  : OrderStatus.Requested,
            paidAmount: 0,
            costBest: finalQuote.totalBeforeCoupon,
            costAfterCoupon: finalQuote.total,
            couponId: finalQuote.couponId ?? undefined,
            quoteId: finalQuote.id,
            expectedTimestamp: eta,
            operatorId: input.operatorId,
            fleetId: input.fleetId,
            providerShare:
              service.providerShareFlat +
              (service.providerSharePercent * finalQuote.totalBeforeCoupon) / 100,
            options,
            packageSize: input.packageSize,
            recipientName: input.recipientName,
            recipientMobileNumber: input.recipientMobileNumber,
            deliveryInstructions: input.deliveryInstructions,
          } as RequestEntity);
          const consumed = await this.fareQuoteService.consume(
            manager,
            finalQuote.id,
            saved.id,
            mode === 'installed-app' ? 'installed-app' : 'quote',
          );
          if (!consumed) {
            const current = await manager
              .getRepository(FareQuoteEntity)
              .findOneBy({ id: finalQuote.id });
            // bug-timeout : deux envois simultanes de la meme commande. Le
            // second attendait le verrou du devis puis echouait alors que la
            // course existait : il renvoie maintenant la course du premier.
            if (current?.consumedAt != null && current.requestId != null) {
              throw new ResentOrder(Number(current.requestId));
            }
            throw fareQuoteError(
              current?.consumedAt != null
                ? FareQuoteRefusal.AlreadyUsed
                : FareQuoteRefusal.Expired,
            );
          }
          await manager.insert(RequestActivityEntity, {
            requestId: saved.id,
            type: activityType,
          });
          return saved;
        },
      );
    } catch (error) {
      if (error instanceof ResentOrder) {
        const resent = await this.resentOrder(error.orderId, input.riderId);
        if (resent != null) return resent;
        throw fareQuoteError(FareQuoteRefusal.AlreadyUsed);
      }
      throw error;
    }
    await this.orderRedisService.add(
      { ...order, fleetIds: fleetIdsInPoint },
      input.intervalMinutes | 0,
    );
    if (!shouldPrePay && isWavesMode() && (await this.dispatchInWaves(order.id, eta))) {
      return order;
    }
    if ((input.intervalMinutes ?? 0) < 30 && !shouldPrePay) {
      this.orderRedisService.driverNotified(order.id, driversWithService);
      this.pubSub.publish('orderCreated', {
        orderCreated: order,
        driverIds: driversWithService.map((driver) => driver.id),
      });
      this.driverNotificationService.requests(driversWithService);
    }
    return order;
  }

  async processPrePay(orderId: number, authorizedAmount: number = 0) {
    let order: RequestEntity = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: { service: true, driver: { fleet: true }, rider: true },
    });
    const riderCredit = await this.riderService.getRiderCreditInCurrency(
      order.riderId,
      order.currency,
    );
    Logger.log(`riderCredit: ${riderCredit}`, 'processPrePay');
    Logger.log(`authorizedAmount: ${authorizedAmount}`, 'processPrePay');
    Logger.log(`serviceFee: ${order.costAfterCoupon}`, 'processPrePay');
    Logger.log(
      `Minmum required authorizedAmount: ${
        order.costAfterCoupon * (order.service.prepayPercent / 100.0)
      }`,
      'processPrePay',
    );
    if (
      riderCredit +
        authorizedAmount -
        order.costAfterCoupon * (order.service.prepayPercent / 100.0) >
      1
    ) {
      throw new ForbiddenError('Credit is not enough');
    }
    // p1-transitions : WaitingForPrePay -> Requested une seule fois. Un retour
    // de passerelle rejoue ne rediffuse pas l'offre aux Kasimen.
    const changed = await transitionOrder(this.orderRepository, order.id, {
      from: [OrderStatus.WaitingForPrePay],
      to: OrderStatus.Requested,
    });
    if (!changed) {
      return this.orderRepository.findOneOrFail({
        where: { id: orderId },
        relations: { service: true, driver: { fleet: true }, rider: true },
      });
    }
    if (isWavesMode() && (await this.dispatchInWaves(order.id, order.expectedTimestamp))) {
      return this.orderRepository.findOneOrFail({
        where: { id: orderId },
        relations: { service: true, driver: { fleet: true }, rider: true },
      });
    }
    const closeDriverIds = (
      await this.driverRedisService.getClose(
        order.points[0],
        order.service.searchRadius,
      )
    ).map((x: DriverLocationWithId) => x.driverId);
    const fleetIdsInPoint = await this.sharedFleetService.getFleetIdsInPoint(
      order.points[0],
    );
    const driversWithService =
      await this.driverService.getOnlineDriversWithServiceId(
        closeDriverIds,
        order.serviceId,
        fleetIdsInPoint,
        { service: order.service, packageSize: order.packageSize },
        order.currency,
      );
    this.orderRedisService.driverNotified(order.id, driversWithService);
    this.pubSub.publish('orderCreated', {
      orderCreated: order,
      driverIds: driversWithService.map((driver) => driver.id),
    });
    this.driverNotificationService.requests(driversWithService);
    return this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: { service: true, driver: { fleet: true }, rider: true },
    });
  }

  /**
   * Fin de course et paiement (p1-transitions + p1-unicite, 2026-09-29).
   *
   * - Verrou de ligne sur la course (SELECT ... FOR UPDATE) : deux fins de course
   *   simultanees (rejeu apres timeout de 20 s, retour de passerelle en meme
   *   temps que l'encaissement especes) s'executent l'une apres l'autre ; la
   *   seconde trouve la course deja payee et ne fait rien.
   * - Transitions permises : Started ou WaitingForPostPay -> WaitingForPostPay
   *   (credit insuffisant) ou WaitingForReview (paye). Deja WaitingForReview ou
   *   Finished : rejeu, rien n'est ecrit (`changed = false`).
   * - Tous les mouvements d'argent sont dans la meme transaction que le
   *   changement de statut, chacun avec sa cle d'unicite `order:<id>:<nature>`.
   * - La capture de preautorisation (HTTP vers la passerelle) se fait HORS
   *   transaction, puis la decision est reprise.
   *
   * `driverId` (optionnel) : exige que la course soit celle de ce Kasiman.
   */
  async finish(
    orderId: number,
    cashAmount = 0.0,
    driverId?: number,
  ): Promise<FinishOutcome> {
    const cash = Number(cashAmount ?? 0);
    let outcome = await this.finishInTransaction(orderId, cash, driverId, true);
    if (outcome.capture != null) {
      let captured = false;
      try {
        const captureResult = await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/capture?id=${outcome.capture.transactionNumber}&amount=${outcome.capture.amount}`,
          ),
        );
        captured = captureResult.data.status == 'OK';
      } catch (error) {
        Logger.warn(
          `capture ${outcome.capture.transactionNumber} (course ${orderId}) : ${(error as Error).message}`,
          'SharedOrderService',
        );
      }
      Logger.log(
        `capture course ${orderId} : ${captured ? 'OK' : 'echec'}`,
        'SharedOrderService',
      );
      outcome = await this.finishInTransaction(orderId, cash, driverId, false);
    }
    // p2-argent I3 : push d'alerte ou de blocage, apres validation.
    await sendDebtCrossingPush(
      this.orderRepository.manager,
      this.driverNotificationService,
      outcome.debtCrossing,
    );
    return outcome;
  }

  private async finishInTransaction(
    orderId: number,
    cashAmount: number,
    driverId: number | undefined,
    allowCapture: boolean,
  ): Promise<FinishOutcome> {
    return this.orderRepository.manager.transaction(async (manager) => {
      const locked = await manager
        .getRepository(RequestEntity)
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :orderId', { orderId })
        .getOne();
      if (locked == null) {
        throw new ForbiddenError('ORDER_NOT_FOUND');
      }
      if (driverId !== undefined && locked.driverId !== driverId) {
        throw new ForbiddenError('Update status to this is not possible');
      }
      const previousStatus = locked.status;
      if (
        previousStatus === OrderStatus.WaitingForReview ||
        previousStatus === OrderStatus.Finished
      ) {
        return {
          changed: false,
          paid: false,
          previousStatus,
          status: previousStatus,
          driverId: locked.driverId,
        };
      }
      if (
        previousStatus !== OrderStatus.Started &&
        previousStatus !== OrderStatus.WaitingForPostPay
      ) {
        throw new ForbiddenError('Update status to this is not possible');
      }
      const order: RequestEntity = await manager
        .getRepository(RequestEntity)
        .findOneOrFail({
          where: { id: orderId },
          relations: { service: true, driver: { fleet: true }, rider: true },
        });
      if (
        order.service.paymentMethod == ServicePaymentMethod.OnlyCredit &&
        cashAmount > 0
      ) {
        throw new ForbiddenError(
          'Cash payment is not available for this service.',
        );
      }
      // p2-argent I1 (2026-10-19) : un service « especes seulement » ne debite
      // jamais le portefeuille du client (A4) ; son credit n'entre pas dans la
      // decision. Avant : un client avec du credit etait debite meme sur
      // OnlyCash.
      // Banc pilote (2026-10-20) : seul un credit POSITIF paie la course. Un
      // solde negatif (frais d'annulation dus) bloquait la fin d'une course
      // payee en especes au prix exact : la driver-app envoie prix + pourboire,
      // le serveur restait en WaitingForPostPay et le Kasiman, sans issue,
      // restait « en course ». La dette du client se solde a sa prochaine
      // recharge (fiche argent §5.5), pas en especes aupres du Kasiman.
      const riderCredit =
        order.service.paymentMethod == ServicePaymentMethod.OnlyCash
          ? 0
          : Math.max(
              0,
              await this.riderService.getRiderCreditInCurrency(
                order.riderId,
                order.currency,
                manager,
              ),
            );
      const providerPercent =
        order.rider.isResident === false
          ? order.service.providerSharePercent *
            order.service.touristMultiplier
          : order.service.providerSharePercent;
      // p2-argent I4 (2026-10-20, decision §8.6) : Kasi finance les coupons.
      // Le Kasiman est paye sur le prix AVANT coupon et la commission porte
      // sur ce prix ; la remise est une ligne KASI:PROMOTIONS. Avant : il
      // recevait `costAfterCoupon` et la commission baissait d'autant.
      const promotion = couponDiscount(order);
      // p2-argent I2 (2026-10-19) : commission brute ; arrondie au franc plus
      // bas (splitCommission). Pourboire hors commission (inchange).
      const rawCommission =
        (providerPercent * (order.costAfterCoupon + promotion)) / 100 +
        order.service.providerShareFlat;
      const unPaidAmount =
        order.costAfterCoupon - order.paidAmount + order.tipAmount;
      if (riderCredit + cashAmount < unPaidAmount) {
        if (allowCapture) {
          const payment = await manager.getRepository(PaymentEntity).find({
            where: {
              userType: 'client',
              userId: order.riderId.toString(),
              status: PaymentStatus.Authorized,
              orderNumber: order.id.toString(),
            },
            order: { id: 'DESC' },
          });
          if (payment.length > 0) {
            // Capture hors transaction, puis nouvelle decision.
            return {
              changed: false,
              paid: false,
              previousStatus,
              status: previousStatus,
              driverId: order.driverId,
              capture: {
                transactionNumber: payment[0].transactionNumber,
                amount: unPaidAmount - riderCredit,
              },
            };
          }
        }
        const changed = previousStatus !== OrderStatus.WaitingForPostPay;
        if (changed) {
          await manager.update(RequestEntity, order.id, {
            status: OrderStatus.WaitingForPostPay,
          });
          await manager.insert(RequestActivityEntity, {
            requestId: order.id,
            type: RequestActivityType.ArrivedToDestination,
          });
        }
        return {
          changed,
          paid: false,
          previousStatus,
          status: OrderStatus.WaitingForPostPay,
          driverId: order.driverId,
        };
      }
      // p2-argent I3 (2026-10-19) : la fin de course est le mouvement qui
      // endette le Kasiman (commission d'une course en especes). Passage du
      // seuil d'alerte ou du plafond detecte sous le verrou du portefeuille ;
      // la push part apres validation, une seule fois (fiche argent §4.2).
      const { crossing: debtCrossing } = await watchDebtCrossing(
        manager,
        order.driverId!,
        order.currency,
        () =>
          this.postFinishEntry(
            manager,
            order,
            rawCommission,
            cashAmount,
            unPaidAmount,
            promotion,
          ),
      );
      await manager.update(RequestEntity, order.id, {
        paidAmount: order.costAfterCoupon,
        status: OrderStatus.WaitingForReview,
        finishTimestamp: new Date(),
      });
      // Activites et remise en ligne du Kasiman dans la meme transaction que
      // le paiement : tout ou rien.
      if (previousStatus === OrderStatus.Started) {
        await manager.insert(RequestActivityEntity, {
          requestId: order.id,
          type: RequestActivityType.ArrivedToDestination,
        });
      }
      await manager.insert(RequestActivityEntity, {
        requestId: order.id,
        type: RequestActivityType.Paid,
      });
      if (order.driverId != null) {
        await manager.update(DriverEntity, order.driverId, {
          status: DriverStatus.Online,
        });
      }
      return {
        changed: true,
        paid: true,
        previousStatus,
        status: OrderStatus.WaitingForReview,
        driverId: order.driverId,
        debtCrossing,
      };
    });
  }

  /**
   * p2-argent I2 (2026-10-19) : la fin de course est UNE ecriture du grand
   * livre (cle `order:<id>:finish`) au lieu de cinq operations sans lien
   * (fiche §3.4). Lignes de portefeuille inchangees pour les apps : memes
   * types, memes cles (`order:<id>:driver-commission`...), memes montants a
   * l'arrondi au franc pres.
   *
   * - Commission arrondie au franc (demi vers le haut), part de flotte
   *   arrondie, part Kasi par difference (splitCommission ; flotte option A :
   *   payee a la fin de course, especes comprises).
   * - Part payee par le portefeuille du client (prix + pourboire - especes),
   *   arrondie au franc : debit du client, credit du Kasiman (une ligne
   *   `OrderFee` de chaque cote, comme avant) ; au grand livre, lignes PRIX et
   *   POURBOIRE distinctes (les especes couvrent d'abord le prix). Avant : le
   *   credit du Kasiman ignorait `paidAmount` ; il vaut toujours 0 a ce stade
   *   (prepaiement desactive), les deux montants sont donc identiques.
   * - `cashCollected` : especes declarees par l'app, pour le releve (I3).
   */
  private async postFinishEntry(
    manager: EntityManager,
    order: RequestEntity,
    rawCommission: number,
    cashAmount: number,
    unPaidAmount: number,
    promotion = 0,
  ): Promise<void> {
    const fleet = order.driver?.fleetId != null ? order.driver.fleet : null;
    const { commission, fleetShare, kasiShare } = splitCommission(rawCommission, fleet);
    const walletPaid = Math.max(0, roundFcfa(unPaidAmount - cashAmount));
    const tipPart = Math.min(Math.max(0, roundFcfa(order.tipAmount ?? 0)), walletPaid);
    const pricePart = walletPaid - tipPart;
    const kasiman = LedgerAccounts.kasiman(order.driverId!);
    const client = LedgerAccounts.client(order.riderId);
    const kasi = LedgerAccounts.kasiProduits();
    const common = { requestId: order.id };

    const lines: LedgerLineInput[] = [
      { account: kasiman, amount: -commission, nature: LedgerLineNature.Commission },
      { account: kasi, amount: kasiShare, nature: LedgerLineNature.Commission },
    ];
    const walletLines: LedgerWalletLineInput[] = [
      {
        account: kasiman,
        amount: -commission,
        fields: {
          ...common,
          status: TransactionStatus.Done,
          action: TransactionAction.Deduct,
          deductType: DriverDeductTransactionType.Commission,
          idempotencyKey: MoneyKey.order(order.id, 'driver-commission'),
        },
      },
      {
        account: kasi,
        amount: kasiShare,
        fields: {
          ...common,
          action: TransactionAction.Recharge,
          rechargeType: ProviderRechargeTransactionType.Commission,
          idempotencyKey: MoneyKey.order(order.id, 'provider-commission'),
        },
      },
    ];
    if (fleet != null && fleetShare > 0) {
      const flotte = LedgerAccounts.flotte(order.driver!.fleetId!);
      lines.push({ account: flotte, amount: fleetShare, nature: LedgerLineNature.PartFlotte });
      walletLines.push({
        account: flotte,
        amount: fleetShare,
        fields: {
          ...common,
          driverId: order.driverId,
          action: TransactionAction.Recharge,
          rechargeType: ProviderRechargeTransactionType.Commission,
          idempotencyKey: MoneyKey.order(order.id, 'fleet-commission'),
        },
      });
    }
    if (walletPaid > 0) {
      lines.push(
        { account: client, amount: -pricePart, nature: LedgerLineNature.Prix },
        { account: client, amount: -tipPart, nature: LedgerLineNature.Pourboire },
        { account: kasiman, amount: pricePart, nature: LedgerLineNature.Prix },
        { account: kasiman, amount: tipPart, nature: LedgerLineNature.Pourboire },
      );
      walletLines.push(
        {
          account: kasiman,
          amount: walletPaid,
          fields: {
            ...common,
            status: TransactionStatus.Done,
            action: TransactionAction.Recharge,
            rechargeType: DriverRechargeTransactionType.OrderFee,
            idempotencyKey: MoneyKey.order(order.id, 'driver-order-fee'),
          },
        },
        {
          account: client,
          amount: -walletPaid,
          fields: {
            ...common,
            status: TransactionStatus.Done,
            action: TransactionAction.Deduct,
            deductType: RiderDeductTransactionType.OrderFee,
            idempotencyKey: MoneyKey.order(order.id, 'rider-order-fee'),
          },
        },
      );
    }
    if (promotion > 0) {
      // p2-argent I4 (decision §8.6) : remise du coupon payee au Kasiman par
      // Kasi. Au portefeuille, une ligne `OrderFee` (valeur existante, lue
      // comme un gain de course par driver-app) avec sa propre cle.
      const promotions = LedgerAccounts.kasiPromotions();
      lines.push(
        { account: kasiman, amount: promotion, nature: LedgerLineNature.Promotion },
        { account: promotions, amount: -promotion, nature: LedgerLineNature.Promotion },
      );
      walletLines.push({
        account: kasiman,
        amount: promotion,
        fields: {
          ...common,
          status: TransactionStatus.Done,
          action: TransactionAction.Recharge,
          rechargeType: DriverRechargeTransactionType.OrderFee,
          description: 'Remise coupon financée par Kasi',
          idempotencyKey: MoneyKey.order(order.id, 'driver-promotion'),
        },
      });
    }
    await postLedgerEntry(manager, {
      idempotencyKey: MoneyKey.order(order.id, 'finish'),
      nature: LedgerEntryNature.FinCourse,
      currency: order.currency,
      requestId: order.id,
      cashCollected: Math.max(0, roundFcfa(cashAmount)),
      lines,
      walletLines,
    });
  }

  /**
   * Attribution manuelle par un operateur (admin-api, assignDriverToOrder).
   *
   * p1-transitions (2026-09-29) : verrou de ligne pendant l'attribution (une
   * acceptation simultanee par un Kasiman ne peut plus s'intercaler entre la
   * lecture et l'ecriture), activite et notifications seulement apres succes,
   * rejeu (meme Kasiman deja attribue) sans effet. Refusee sur une course
   * demarree, terminee ou annulee (avant : acceptee sans condition, ce qui
   * pouvait reattribuer une course deja payee).
   */
  async assignOrderToDriver(orderId: number, driverId: number) {
    const [travel, driverLocation] = await Promise.all([
      this.orderRepository.findOneOrFail({
        where: { id: orderId },
        relations: { driver: { car: true, carColor: true }, service: true },
      }),
      this.driverRedisService.getDriverCoordinate(driverId),
    ]);
    const metrics =
      driverLocation != null
        ? await this.routingService.getSumDistanceAndDuration([
            travel.points[0],
            driverLocation,
          ])
        : { distance: 0, duration: 0 };
    const dt = new Date();
    const etaPickup = dt.setSeconds(dt.getSeconds() + metrics.duration);
    const assignment = await this.orderRepository.manager.transaction(
      async (manager) => {
        const locked = await manager
          .getRepository(RequestEntity)
          .createQueryBuilder('request')
          .setLock('pessimistic_write')
          .where('request.id = :orderId', { orderId })
          .getOne();
        if (locked == null) {
          throw new ForbiddenError('Already Taken');
        }
        if (
          locked.driverId === driverId &&
          (locked.status === OrderStatus.DriverAccepted ||
            locked.status === OrderStatus.Arrived)
        ) {
          return { changed: false, previousDriverId: locked.driverId };
        }
        if (!OPERATOR_ASSIGNABLE_STATUSES.includes(locked.status)) {
          throw new ForbiddenError('Already Taken');
        }
        await manager.update(RequestEntity, orderId, {
          status: OrderStatus.DriverAccepted,
          etaPickup: new Date(etaPickup),
          driverId,
        });
        await manager.insert(RequestActivityEntity, {
          requestId: orderId,
          type: RequestActivityType.DriverAccepted,
        });
        if (locked.driverId != null && locked.driverId !== driverId) {
          await manager.update(DriverEntity, locked.driverId, {
            status: DriverStatus.Online,
          });
        }
        await manager.update(DriverEntity, driverId, {
          status: DriverStatus.InService,
        });
        return { changed: true, previousDriverId: locked.driverId };
      },
    );
    if (!assignment.changed) {
      return this.orderRepository.findOneOrFail({
        where: { id: orderId },
        relations: {
          driver: { car: true, carColor: true },
          service: true,
          rider: true,
        },
      });
    }
    if (
      assignment.previousDriverId != null &&
      assignment.previousDriverId !== driverId &&
      travel.driver != null
    ) {
      this.driverNotificationService.canceled(travel.driver);
      travel.status = OrderStatus.RiderCanceled;
      this.pubSub.publish('orderUpdated', { orderUpdated: travel });
    }
    await this.orderRedisService.expire([orderId]);
    const result = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: {
        driver: { car: true, carColor: true },
        service: true,
        rider: true,
      },
    });
    this.pubSub.publish('orderUpdated', { orderUpdated: result });
    this.pubSub.publish('orderRemoved', { orderRemoved: result }); // This one has a filter to let know all except the one accepted.
    this.riderNotificationService.bookingAssigned(
      result.rider,
      result.expectedTimestamp.toISOString(),
    );
    this.driverNotificationService.assigned(
      result.driver!,
      result.expectedTimestamp.toTimeString(),
      result.addresses[0],
      result.addresses[result.addresses.length - 1],
    );
    return result;
  }
}

/**
 * p2-argent I4 (decision §8.6) : remise du coupon d'une course, financee par
 * Kasi = prix avant coupon (prix du devis + attente) - prix apres coupon,
 * entier, jamais negatif. 0 sans coupon.
 */
export function couponDiscount(order: {
  couponId?: number | null;
  costBest: number;
  costAfterCoupon: number;
  waitMinutes?: number;
  service?: { perMinuteWait?: number } | null;
}): number {
  if (order.couponId == null) return 0;
  const beforeCoupon =
    Number(order.costBest) +
    Number(order.waitMinutes ?? 0) * Number(order.service?.perMinuteWait ?? 0);
  return Math.max(0, roundFcfa(beforeCoupon) - roundFcfa(Number(order.costAfterCoupon)));
}

/** Resultat de `SharedOrderService.finish` (p1-transitions). */
export interface FinishOutcome {
  /** false : rien n'a change (rejeu, ou deja en attente de paiement). */
  changed: boolean;
  /** true : paiement enregistre, course passee en WaitingForReview. */
  paid: boolean;
  previousStatus: OrderStatus;
  status: OrderStatus;
  driverId?: number;
  /** Interne : capture de preautorisation a tenter hors transaction. */
  capture?: { transactionNumber: string; amount: number };
  /** p2-argent I3 : seuil de dette franchi par cette fin de course (push). */
  debtCrossing?: DebtCrossing | null;
}

/**
 * Statuts depuis lesquels un operateur peut attribuer une course : offre
 * ouverte, expiree (attribution manuelle apres expiration), en attente de
 * prepaiement, ou deja attribuee mais pas demarree (reattribution).
 */
const OPERATOR_ASSIGNABLE_STATUSES: OrderStatus[] = [
  ...UNASSIGNED_STATUSES,
  OrderStatus.Expired,
  OrderStatus.WaitingForPrePay,
  OrderStatus.DriverAccepted,
  OrderStatus.Arrived,
];

