import { QueryService } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMessageEntity } from '@kasi/database/request-message.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  RIDER_NOTIFICATION_SERVICE,
  IRiderNotificationService,
} from '@kasi/order/interfaces/rider-notification.interface';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'typeorm';

import { OrderMessageDTO } from './dto/order-message.dto';
import { OrderMessageInput } from './dto/order-message.input';

@QueryService(OrderMessageEntity)
export class ChatService extends TypeOrmQueryService<OrderMessageEntity> {
  constructor(
    @InjectRepository(OrderMessageEntity)
    public repository: Repository<OrderMessageEntity>,
    @InjectRepository(RequestEntity)
    private requestRepository: Repository<RequestEntity>,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    @Inject(RIDER_NOTIFICATION_SERVICE) private readonly riderNotificationService: IRiderNotificationService,
  ) {
    super(repository);
  }

  override async createOne(input: OrderMessageInput) {
    let message = await super.createOne({ ...input, sentByDriver: true });
    const order = await this.requestRepository.findOne({where: { id: message.requestId }, 
      relations: {
        rider: true,
        driver: true
      },
    });
    message = await this.getById(message.id);
    this.riderNotificationService.message(order.rider, message);
    this.pubSub.publish<{
      newMessageReceived: OrderMessageDTO;
      riderId: number;
    }>('newMessageForRider', {
      newMessageReceived: message,
      riderId: order.riderId,
    });
    return message;
  }

  async updateLastSeenMessagesAt(orderId: number): Promise<boolean> {
    await this.requestRepository.update(orderId, {
      driverLastSeenMessagesAt: new Date(),
    });
    return true;
  }
}
