import { CRUDResolver, InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { MaskedCallDTO } from '@kasi/order/dto/masked-call.dto';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { DispatchWaveService } from '../dispatch/dispatch-wave.service';
import { DriverOrderQueryService } from './driver-order.query-service';
import { AvailableOrderDTO } from './dto/available-order.dto';
import { OrderDTO } from './dto/order.dto';
import { UpdateOrderInput } from './dto/update-order.input';
import { OrderService } from './order.service';

@Resolver(() => OrderDTO)
@UseGuards(GqlAuthGuard)
export class OrderResolver extends CRUDResolver(OrderDTO, {
  UpdateDTOClass: UpdateOrderInput,
  create: { disabled: true },
  update: { many: { disabled: true } },
  delete: { disabled: true },
  enableAggregate: true,
}) {
  constructor(
    public readonly driverOrderService: DriverOrderQueryService,
    @Inject(CONTEXT) private context: UserContext,
    private orderService: OrderService,
    private driverRedisService: DriverRedisService,
    @InjectPubSub()
    private redisPubSub: RedisPubSub,
    private dispatchWaveService: DispatchWaveService,
  ) {
    super(driverOrderService as any);
  }

  // @Query(() => OrderDTO)
  // async currentOrder(): Promise<OrderDTO> {
  //   return this.orderRepository.findOne({ driverId: this.context.req.user.id, status: In([OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started, OrderStatus.WaitingForPostPay]) });
  // }

  @Query(() => [OrderDTO])
  async availableOrders(): Promise<OrderDTO[]> {
    return this.orderService.getOrdersForDriver(this.context.req.user.id);
  }

  // Appel masqué : le driver participant d'une course active obtient un numéro
  // pour joindre le rider (numéro proxy en TwilioVoice, vrai numéro en Direct).
  @Mutation(() => MaskedCallDTO)
  async requestMaskedCall(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<MaskedCallDTO> {
    return this.orderService.requestMaskedCall(
      this.context.req.user.id,
      Number(orderId),
    );
  }

  /**
   * p2-dispatch D4 (2026-10-20, Q13) : refus explicite d'une offre. Ajout
   * facultatif : les driver-app installees ne l'appellent pas (leurs offres
   * finissent `no_answer` dans le journal). Vrai si le refus est enregistre
   * (rejeu compris) ; faux sans offre ouverte pour ce Kasiman ou en
   * `DISPATCH_MODE=legacy` (aucun effet). Le Kasiman suivant est sollicite.
   */
  @Mutation(() => Boolean)
  async rejectOrder(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<boolean> {
    return this.dispatchWaveService.reject(
      Number(orderId),
      this.context.req.user.id,
    );
  }

  @Mutation(() => [OrderDTO])
  async updateDriversLocationNew(
    @Args('point', { type: () => Point }) point: Point,
  ): Promise<AvailableOrderDTO[]> {
    this.redisPubSub.publish('driverLocationUpdated', {
      driverId: this.context.req.user.id,
      point,
    });
    await this.driverRedisService.setLocation(this.context.req.user.id, point);
    return this.orderService.getOrdersForDriver(this.context.req.user.id);
  }
}
