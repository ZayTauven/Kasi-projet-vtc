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

  async cancelOrder(orderId: number): Promise<RequestEntity> {
    let order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { service: true },
    });
    this.activityRepository.insert({
      requestId: order.id,
      type: RequestActivityType.CanceledByOperator,
    });
    await this.orderRepository.update(order.id, {
      status: OrderStatus.Expired,
      finishTimestamp: new Date(),
      costAfterCoupon: 0,
    });
    this.orderRedisService.expire([order.id]);
    this.pubSub.publish('orderRemoved', { orderRemoved: order });
    return order;
  }
}
