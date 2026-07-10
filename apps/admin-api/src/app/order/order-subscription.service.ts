import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Injectable, Logger } from '@nestjs/common';
import { Args, ID, Subscription } from '@nestjs/graphql';
import { RequestEntity } from '@kasi/database/request.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { OrderDTO } from './dto/order.dto';

@Injectable()
export class OrderSubscriptionService {
  constructor(
    @InjectPubSub()
    private pubSub: RedisPubSub,
  ) {}

  @Subscription(() => OrderDTO, {
    filter(
      this: OrderSubscriptionService,
      payload: { orderUpdated: RequestEntity },
      variables: { orderId: number },
      context,
    ) {
      return variables.orderId == payload.orderUpdated.id;
    },
  })
  orderUpdated(@Args('orderId', { type: () => ID }) orderId: number) {
    return this.pubSub.asyncIterator('orderUpdated');
  }
}
