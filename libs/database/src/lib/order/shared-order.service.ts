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
import { In, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { OrderStatus } from '../entities/enums/order-status.enum';
import { PackageSize } from '../entities/enums/package-size.enum';
import { RequestEntity } from '../entities/request.entity';
import { ServiceCategoryEntity } from '../entities/service-category.entity';
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
  ) {}

  async getZonePricingsForPoints(
    from: Point,
    to: Point,
  ): Promise<ZonePriceEntity[]> {
    // SQL Postgres/PostGIS : placeholders $1..$4 (les « ? » MySQL ne sont pas
    // des paramètres ici), mots réservés "from"/"to" entre guillemets doubles,
    // point construit avec le SRID 4326 des colonnes de zone_price.
    let pricings: ZonePriceEntity[] = await this.zonePriceRepository.query(
      'SELECT * FROM zone_price WHERE ST_Within(ST_SetSRID(ST_MakePoint($1, $2), 4326), "from") AND ST_Within(ST_SetSRID(ST_MakePoint($3, $4), 4326), "to")',
      [from.lng, from.lat, to.lng, to.lat],
    );
    pricings = await this.zonePriceRepository.find({
      where: { id: In(pricings.map((p) => p.id)) },
      relations: { services: true, fleets: true },
    });
    return pricings;
  }

  async calculateFare(input: {
    points: Point[];
    twoWay?: boolean;
    coupon?: CouponEntity;
    riderId?: number;
  }) {
    let zonePricings: ZonePriceEntity[] = [];
    if (input.points.length == 2) {
      zonePricings = await this.getZonePricingsForPoints(
        input.points[0],
        input.points[1],
      );
    }
    const regions = await this.regionService.getRegionWithPoint(
      input.points[0],
    );
    if (regions.length < 1) {
      throw new ForbiddenError(CalculateFareError.RegionUnsupported);
    }
    const servicesInRegion = await this.regionService.getRegionServices(
      regions[0].id,
    );
    if (servicesInRegion.length < 1) {
      throw new ForbiddenError(CalculateFareError.NoServiceInRegion);
    }
    if ((input.twoWay ?? false) && input.points.length > 1) {
      input.points.push(input.points[0]);
    }
    const metrics =
      servicesInRegion.findIndex((x) => x.perHundredMeters > 0) > -1
        ? await this.routingService.getSumDistanceAndDuration(input.points)
        : { distance: 0, duration: 0, directions: [] };
    const cats = await this.serviceCategoryRepository.find({
      relations: { services: { media: true, options: true } },
    });
    let isResident = process.env.MOTAXI == null;
    if (input.riderId != null) {
      const rider = await this.riderService.findById(input.riderId);
      isResident = rider?.isResident ?? process.env.MOTAXI == null;
    }
    const fleetIdsInPoint = await this.sharedFleetService.getFleetIdsInPoint(
      input.points[0],
    );
    const feeMultiplier =
      (await this.sharedFleetService.getFleetById(fleetIdsInPoint[0]))
        ?.feeMultiplier ?? 1;
    const _cats = cats
      .map((cat) => {
        const { services, ..._cat } = cat;

        const _services = services
          .filter(
            (x) => servicesInRegion.filter((y) => y.id == x.id).length > 0,
          )
          .map((service) => {
            let cost = this.servicesService.calculateCost(
              service,
              metrics.distance,
              metrics.duration,
              new Date(),
              feeMultiplier,
              isResident,
            );
            if (
              zonePricings.length > 0 &&
              zonePricings[0].services.filter(
                (_service) => _service.id == service.id,
              ).length > 0
            ) {
              cost = zonePricings[0].cost;
              let eta = new Date();
              for (const _multiplier of zonePricings[0].timeMultipliers) {
                const startMinutes =
                  parseInt(_multiplier.startTime.split(':')[0]) * 60 +
                  parseInt(_multiplier.startTime.split(':')[1]);
                const nowMinutes = eta.getHours() * 60 + eta.getMinutes();
                const endMinutes =
                  parseInt(_multiplier.endTime.split(':')[0]) * 60 +
                  parseInt(_multiplier.endTime.split(':')[1]);
                if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
                  cost *= _multiplier.multiply;
                }
              }
            }
            if (input.coupon == null) {
              return {
                ...service,
                cost,
              };
            } else {
              const costAfterCoupon =
                this.commonCouponService.applyCouponOnPrice(input.coupon, cost);
              return {
                ...service,
                cost,
                costAfterCoupon,
              };
            }
          });
        return {
          ..._cat,
          services: _services,
        };
      })
      .filter((x) => x.services.length > 0);
    return {
      ...metrics,
      currency: regions[0].currency,
      services: _cats,
    };
  }

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
    fleetId?: number;
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
  }): Promise<RequestEntity> {
    let zonePricings: ZonePriceEntity[] = [];
    if (input.points.length == 2) {
      zonePricings = await this.getZonePricingsForPoints(
        input.points[0],
        input.points[1],
      );
    }
    const service = await this.servicesService.getWithId(input.serviceId);
    if (service == undefined) {
      throw new ForbiddenError('SERVICE_NOT_FOUND');
    }
    const closeDrivers = await this.driverRedisService.getClose(
      input.points[0],
      service.searchRadius,
    );
    const driverIds = closeDrivers.map((x: DriverLocationWithId) => x.driverId);
    const fleetIdsInPoint = await this.sharedFleetService.getFleetIdsInPoint(
      input.points[0],
    );
    const driversWithService =
      await this.driverService.getOnlineDriversWithServiceId(
        driverIds,
        input.serviceId,
        fleetIdsInPoint,
        { service, packageSize: input.packageSize },
      );
    let optionFee = 0;
    let options: ServiceOptionEntity[] = [];
    if (input.optionIds != null) {
      options = await this.serviceOptionRepository.findBy({
        id: In(input.optionIds),
      });
      if (
        options.filter((option) => option.type == ServiceOptionType.TwoWay)
          .length > 0
      ) {
        input.points.push(input.points[0]);
      }
      const paidOptions = options.filter(
        (option) => option.type == ServiceOptionType.Paid,
      );
      optionFee =
        paidOptions.length == 0
          ? 0
          : paidOptions
              .map((option) => option.additionalFee ?? 0)
              .reduce(
                (previous: number, current: number) => (current += previous),
              );
    }
    const metrics =
      service.perHundredMeters > 0
        ? await this.routingService.getSumDistanceAndDuration(input.points)
        : { distance: 0, duration: 0, directions: [] };
    const eta = new Date(
      new Date().getTime() + (input.intervalMinutes | 0) * 60 * 1000,
    );
    const rider =
      input.riderId == null
        ? null
        : await this.riderService.findById(input.riderId);
    const isResident = rider?.isResident ?? process.env.MOTAXI == null;
    const feeMultiplier =
      fleetIdsInPoint.length == 0
        ? 1
        : (await this.sharedFleetService.getFleetById(fleetIdsInPoint[0]))
            ?.feeMultiplier ?? 1;
    let cost =
      this.servicesService.calculateCost(
        service,
        metrics.distance,
        metrics.duration,
        eta,
        feeMultiplier,
        isResident,
      ) + optionFee;
    const zonePricing = zonePricings.filter((price) => {
      return (
        price.services.filter((service) => service.id == input.serviceId)
          .length > 0
      );
    });
    if (zonePricing.length > 0) {
      cost = zonePricing[0].cost;
      let eta = new Date();
      for (const _multiplier of zonePricings[0].timeMultipliers) {
        const startMinutes =
          parseInt(_multiplier.startTime.split(':')[0]) * 60 +
          parseInt(_multiplier.startTime.split(':')[1]);
        const nowMinutes = eta.getHours() * 60 + eta.getMinutes();
        const endMinutes =
          parseInt(_multiplier.endTime.split(':')[0]) * 60 +
          parseInt(_multiplier.endTime.split(':')[1]);
        if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
          cost *= _multiplier.multiply;
        }
      }
    }
    const regions = await this.regionService.getRegionWithPoint(
      input.points[0],
    );
    if (
      service.maximumDestinationDistance != 0 &&
      metrics.distance > service.maximumDestinationDistance
    ) {
      throw new ForbiddenError('DISTANCE_TOO_FAR');
    }
    let shouldPrePay = false;
    let paidAmount = 0;
    if (service.prepayPercent > 0 && input.riderId != null) {
      const balance = await this.riderService.getRiderCreditInCurrency(
        input.riderId,
        regions[0].currency,
      );
      const amountNeedsToBePrePaid = (cost * service.prepayPercent) / 100;
      if (balance < amountNeedsToBePrePaid) {
        shouldPrePay = true;
      } else {
        // await this.riderService.rechargeWallet({
        //     amount: -amountNeedsToBePrePaid,
        //     currency: regions[0].currency,
        //     action: TransactionAction.Deduct,
        //     deductType: RiderDeductTransactionType.OrderFee,
        //     status: TransactionStatus.Done,
        //     riderId: input.riderId
        // });
        // paidAmount = amountNeedsToBePrePaid;
      }
    }
    let order: RequestEntity = await this.orderRepository.save({
      serviceId: input.serviceId,
      currency: regions[0].currency,
      riderId: input.riderId,
      points: input.points,
      addresses: input.addresses.map((address) => address.replace(', ', '-')),
      distanceBest: metrics.distance,
      durationBest: metrics.duration,
      directions: metrics.directions,
      status: shouldPrePay
        ? OrderStatus.WaitingForPrePay
        : input.intervalMinutes > 30
        ? OrderStatus.Booked
        : driversWithService.length < 1
        ? OrderStatus.NoCloseFound
        : OrderStatus.Requested,
      paidAmount: paidAmount,
      costBest: cost,
      costAfterCoupon: cost,
      expectedTimestamp: eta,
      operatorId: input.operatorId,
      fleetId: input.fleetId,
      providerShare:
        service.providerShareFlat + (service.providerSharePercent * cost) / 100,
      options: options,
      packageSize: input.packageSize,
      recipientName: input.recipientName,
      recipientMobileNumber: input.recipientMobileNumber,
      deliveryInstructions: input.deliveryInstructions,
    });
    if (input.couponCode != null && input.couponCode != '' && rider != null) {
      order = await this.commonCouponService.applyCoupon(
        input.couponCode,
        order.id,
        rider.id,
      );
    }
    let activityType = RequestActivityType.RequestedByRider;
    if (input.intervalMinutes > 0) {
      activityType =
        input.operatorId == null
          ? (activityType = RequestActivityType.BookedByRider)
          : RequestActivityType.BookedByOperator;
    } else {
      activityType =
        input.operatorId == null
          ? (activityType = RequestActivityType.RequestedByRider)
          : RequestActivityType.RequestedByOperator;
    }
    this.activityRepository.insert({ requestId: order.id, type: activityType });
    await this.orderRedisService.add(
      { ...order, fleetIds: fleetIdsInPoint },
      input.intervalMinutes | 0,
    );
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
    await this.orderRepository.update(order.id, {
      status: OrderStatus.Requested,
    });
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

  async finish(orderId: number, cashAmount = 0.0) {
    const order: RequestEntity = await this.orderRepository.findOneOrFail({
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
    let riderCredit = await this.riderService.getRiderCreditInCurrency(
      order.riderId,
      order.currency,
    );
    const providerPercent =
      order.rider.isResident === false
        ? order.service.providerSharePercent * order.service.touristMultiplier
        : order.service.providerSharePercent;
    const commission =
      (providerPercent * order.costAfterCoupon) / 100 +
      order.service.providerShareFlat;
    let unPaidAmount =
      order.costAfterCoupon - order.paidAmount + order.tipAmount;
    if (riderCredit + cashAmount < unPaidAmount) {
      const payment = await this.paymentRepository.find({
        where: {
          userType: 'client',
          userId: order.riderId.toString(),
          status: PaymentStatus.Authorized,
          orderNumber: order.id.toString(),
        },
        order: { id: 'DESC' },
      });
      const status = OrderStatus.WaitingForPostPay;
      if (payment.length > 0) {
        const captureResult = await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/capture?id=${
              payment[0].transactionNumber
            }&amount=${unPaidAmount - riderCredit}`,
          ),
        );
        if (captureResult.data.status == 'OK') {
          riderCredit = await this.riderService.getRiderCreditInCurrency(
            order.riderId,
            order.currency,
          );
          unPaidAmount =
            order.costAfterCoupon - order.paidAmount + order.tipAmount;
          if (riderCredit + cashAmount < unPaidAmount) {
            await this.orderRepository.update(order.id, {
              status,
            });
            return;
          }
        } else {
          await this.orderRepository.update(order.id, {
            status,
          });
          return;
        }
      } else {
        await this.orderRepository.update(order.id, {
          status,
        });
        return;
      }
    }
    await this.driverService.rechargeWallet({
      status: TransactionStatus.Done,
      driverId: order.driverId!,
      currency: order.currency,
      action: TransactionAction.Deduct,
      deductType: DriverDeductTransactionType.Commission,
      amount: -1 * commission,
      requestId: order.id,
    });
    let fleetShare = 0;
    if (order.driver?.fleetId != null) {
      fleetShare =
        (commission * order.driver.fleet!.commissionSharePercent) / 100 +
        order.driver.fleet!.commissionShareFlat;
      if (fleetShare > 0) {
        this.sharedFleetService.rechargeWallet({
          fleetId: order.driver.fleetId,
          action: TransactionAction.Recharge,
          rechargeType: ProviderRechargeTransactionType.Commission,
          amount: fleetShare,
          currency: order.currency,
          requestId: order.id,
          driverId: order.driverId,
        });
      }
    }
    await this.sharedProviderService.rechargeWallet({
      action: TransactionAction.Recharge,
      rechargeType: ProviderRechargeTransactionType.Commission,
      currency: order.currency,
      amount: commission - fleetShare,
    });
    if (order.costAfterCoupon - cashAmount > 0) {
      await this.driverService.rechargeWallet({
        status: TransactionStatus.Done,
        driverId: order.driverId!,
        currency: order.currency,
        requestId: order.id,
        action: TransactionAction.Recharge,
        rechargeType: DriverRechargeTransactionType.OrderFee,
        amount: order.costAfterCoupon - cashAmount + order.tipAmount,
      });
    }
    if (riderCredit > 0 && cashAmount < unPaidAmount) {
      await this.riderService.rechargeWallet({
        status: TransactionStatus.Done,
        action: TransactionAction.Deduct,
        deductType: RiderDeductTransactionType.OrderFee,
        currency: order.currency,
        requestId: order.id,
        amount: -1 * (unPaidAmount - cashAmount),
        riderId: order.riderId,
      });
    }
    await this.orderRepository.update(order.id, {
      paidAmount: order.costAfterCoupon,
      status: OrderStatus.WaitingForReview,
      finishTimestamp: new Date(),
    });
    await this.driverService.updateDriverStatus(
      order.driverId!,
      DriverStatus.Online,
    );
    this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.Paid,
    });
  }

  async assignOrderToDriver(orderId: number, driverId: number) {
    const [travel, driverLocation] = await Promise.all([
      this.orderRepository.findOneOrFail({
        where: { id: orderId },
        relations: { driver: { car: true, carColor: true }, service: true },
      }),
      this.driverRedisService.getDriverCoordinate(driverId),
    ]);
    this.activityRepository.insert({
      requestId: orderId,
      type: RequestActivityType.DriverAccepted,
    });
    //  const allowedStatuses = [OrderStatus.Found, OrderStatus.NoCloseFound, OrderStatus.Requested, OrderStatus.Booked];
    // if (travel == null || !allowedStatuses.includes(travel.status)) {
    if (travel == null) {
      throw new ForbiddenError('Already Taken');
    }
    if (travel.driverId != null) {
      this.driverNotificationService.canceled(travel.driver!);
      await this.driverService.updateDriverStatus(
        travel.driverId,
        DriverStatus.Online,
      );
      travel.status = OrderStatus.RiderCanceled;
      this.pubSub.publish('orderUpdated', { orderUpdated: travel });
    }
    const metrics =
      driverLocation != null
        ? await this.routingService.getSumDistanceAndDuration([
            travel.points[0],
            driverLocation,
          ])
        : { distance: 0, duration: 0 };
    const dt = new Date();
    const etaPickup = dt.setSeconds(dt.getSeconds() + metrics.duration);
    this.driverService.updateDriverStatus(driverId, DriverStatus.InService);
    await this.orderRedisService.expire([orderId]);
    await this.orderRepository.update(orderId, {
      status: OrderStatus.DriverAccepted,
      etaPickup: new Date(etaPickup),
      driverId,
    });
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

enum CalculateFareError {
  RegionUnsupported = 'REGION_UNSUPPORTED',
  NoServiceInRegion = 'NO_SERVICE_IN_REGION',
}
