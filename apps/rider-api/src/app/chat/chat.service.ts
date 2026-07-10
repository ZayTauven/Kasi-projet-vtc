import { QueryService } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMessageEntity } from '@kasi/database/request-message.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
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
    @Inject(DRIVER_NOTIFICATION_SERVICE) private readonly driverNotificationService: IDriverNotificationService,
  ) {
    super(repository);
  }

  override async createOne(input: OrderMessageInput) {
    let message = await super.createOne({ ...input, sentByDriver: false });
    const order = await this.requestRepository.findOne({
      where: { id: message.requestId },
      relations: {
        rider: true,
        driver: true,
      },
    });
    message = await this.getById(message.id);
    this.driverNotificationService.message(order.driver, message);
    this.pubSub.publish<{
      newMessageReceived: OrderMessageDTO;
      driverId: number;
    }>('newMessageForDriver', {
      newMessageReceived: message,
      driverId: order.driverId,
    });
    return message;
  }

  async updateLastSeenMessagesAt(orderId: number): Promise<boolean> {
    await this.requestRepository.update(orderId, {
      riderLastSeenMessagesAt: new Date(),
    });
    return true;
  }
}
