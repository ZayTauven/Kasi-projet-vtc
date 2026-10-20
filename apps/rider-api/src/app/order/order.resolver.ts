import { Inject, Logger, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommonCouponService } from '@kasi/coupon/common-coupon.service';
import { Point } from '@kasi/database';
import { RequestEntity } from '@kasi/database/request.entity';
import { SharedOrderService } from '@kasi/order/shared-order.service';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { UserContextOptional } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { GqlOptionalAuthGuard } from '../auth/jwt-optional-gql-auth.guard';
import { MaskedCallDTO } from '@kasi/order/dto/masked-call.dto';
import { CalculateFareDTO } from './dto/calculate-fare.dto';
import { CalculateFareInput } from './dto/calculate-fare.input';
import { CreateOrderInput } from './dto/create-order.input';
import { CurrentOrder } from './dto/current-order.dto';
import { OrderDTO } from './dto/order.dto';
import { SubmitFeedbackInput } from './dto/submit-feedback.input';
import { RiderOrderService } from './rider-order.service';

@Resolver(() => OrderDTO)
export class OrderResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContextOptional,
    private orderService: SharedOrderService,
    private riderOrderService: RiderOrderService,
    private driverRedisService: DriverRedisService,
    private commonCouponService: CommonCouponService,
  ) {}

  @Query(() => OrderDTO)
  @UseGuards(GqlAuthGuard)
  async currentOrder(): Promise<OrderDTO> {
    return this.riderOrderService.getCurrentOrder(this.context.req.user.id, [
      'driver',
      'driver.carColor',
      'driver.car',
      'conversation',
    ]);
  }

  @Query(() => CurrentOrder)
  @UseGuards(GqlAuthGuard)
  async currentOrderWithLocation(): Promise<CurrentOrder> {
    const order = await this.riderOrderService.getCurrentOrder(
      this.context.req.user.id,
      ['driver', 'driver.carColor', 'driver.car'],
    );
    let driverLocation;
    if (order?.driver != null) {
      driverLocation = this.driverRedisService.getDriverCoordinate(
        order.driver.id,
      );
    }
    return { order, driverLocation };
  }

  /**
   * p2-argent I4 (2026-10-20) : meme calcul que getFare (client connecte,
   * coupon, options, heure de prise en charge), devis enregistres. Avant :
   * ni client ni coupon (C6).
   */
  @Mutation(() => CalculateFareDTO)
  @UseGuards(GqlAuthGuard)
  async calculateFare(
    @Args('input', { type: () => CalculateFareInput })
    input: CalculateFareInput,
  ): Promise<CalculateFareDTO> {
    return this.fare(input, this.context.req.user.id);
  }

  @Query(() => CalculateFareDTO)
  @UseGuards(GqlOptionalAuthGuard)
  async getFare(
    @Args('input', { type: () => CalculateFareInput })
    input: CalculateFareInput,
  ): Promise<CalculateFareDTO> {
    return this.fare(input, this.context.req.user?.id);
  }

  /**
   * Apercu chiffre par FareQuoteService ; chaque service porte son devis
   * (`quoteId`, `quoteExpiresAt`), que createOrder consomme.
   */
  private async fare(
    input: CalculateFareInput,
    riderId: number | undefined,
  ): Promise<CalculateFareDTO> {
    let coupon;
    if (input.couponCode != null && input.couponCode != '') {
      coupon = await this.commonCouponService.checkCoupon(input.couponCode);
      // p2-argent I1 (2026-10-19) : coupon « premiere course » refuse des
      // l'apercu si le client connecte a deja termine une course (service et
      // bornes de prix : verifies service par service dans le devis).
      if (riderId != null) {
        await this.commonCouponService.assertFirstTravel(coupon, riderId);
      }
    }
    return this.orderService.calculateFare({
      points: input.points,
      twoWay: input.twoWay,
      selectedOptionIds: input.selectedOptionIds,
      intervalMinutes: input.intervalMinutes,
      coupon,
      riderId,
      persist: true,
    }) as Promise<CalculateFareDTO>;
  }

  @Mutation(() => OrderDTO)
  @UseGuards(GqlAuthGuard)
  async createOrder(
    @Args('input', { type: () => CreateOrderInput }) input: CreateOrderInput,
  ): Promise<OrderDTO> {
    Logger.log(input.optionIds);
    return this.orderService.createOrder({
      ...input,
      riderId: this.context.req.user.id,
      optionIds: input.optionIds,
    });
  }

  @Mutation(() => OrderDTO)
  @UseGuards(GqlAuthGuard)
  async cancelOrder(): Promise<OrderDTO> {
    return this.riderOrderService.cancelRiderLastOrder(
      this.context.req.user.id,
    );
  }

  @Mutation(() => OrderDTO)
  @UseGuards(GqlAuthGuard)
  async cancelBooking(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<OrderDTO> {
    // p1-transitions : la reservation doit etre celle du client connecte.
    return this.riderOrderService.cancelOrder(
      Number(id),
      this.context.req.user.id,
    );
  }

  @Query(() => Point, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async getCurrentOrderDriverLocation(): Promise<Point> {
    const order = await this.riderOrderService.getCurrentOrder(
      this.context.req.user.id,
    );
    if (order?.driverId != null) {
      Logger.log(`driver id: ${order.driverId}`);
      const coordinate = await this.driverRedisService.getDriverCoordinate(
        order.driverId,
      );
      Logger.log(JSON.stringify(coordinate));
      return coordinate;
    } else {
      return null;
    }
  }

  @Query(() => [Point])
  async getDriversLocation(
    @Args('center', { type: () => Point, nullable: true }) center?: Point,
  ): Promise<Point[]> {
    if (center == null) return [];
    return this.driverRedisService.getCloseWithoutIds(center, 1000);
  }

  // Appel masqué : le rider participant d'une course active obtient un numéro
  // pour joindre le driver (numéro proxy en TwilioVoice, vrai numéro en Direct).
  @Mutation(() => MaskedCallDTO)
  @UseGuards(GqlAuthGuard)
  async requestMaskedCall(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<MaskedCallDTO> {
    return this.riderOrderService.requestMaskedCall(
      this.context.req.user.id,
      Number(orderId),
    );
  }

  @Mutation(() => OrderDTO)
  @UseGuards(GqlAuthGuard)
  async submitReview(
    @Args('review', { type: () => SubmitFeedbackInput })
    review: SubmitFeedbackInput,
  ): Promise<RequestEntity> {
    return this.riderOrderService.submitReview(
      this.context.req.user.id,
      review,
    );
  }
}
