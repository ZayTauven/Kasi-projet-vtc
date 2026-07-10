import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { RedisPubSubProvider } from '@kasi/database';
import { OrderMessageEntity } from '@kasi/database/request-message.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { FirebaseNotificationModule } from '@kasi/order/firebase-notification-service/firebase-notification-service.module';

import { OrderModule } from '../order/order.module';
import { ChatService } from './chat.service';
import { ChatSubscriptionService } from './chat.subscription.service';
import { OrderMessageDTO } from './dto/order-message.dto';
import { OrderMessageInput } from './dto/order-message.input';
import { ChatResolver } from './chat.resolver';

@Module({
  imports: [
    OrderModule,
    FirebaseNotificationModule.register(),
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          OrderMessageEntity,
          RequestEntity,
        ]),
        FirebaseNotificationModule.register(),
      ],
      services: [ChatService],
      pubSub: RedisPubSubProvider.provider(),
      resolvers: [
        {
          EntityClass: OrderMessageEntity,
          DTOClass: OrderMessageDTO,
          CreateDTOClass: OrderMessageInput,
          ServiceClass: ChatService,
          pagingStrategy: PagingStrategies.NONE,
          create: { many: { disabled: true } },
          read: { one: { disabled: true } },
          update: { disabled: true },
          delete: { disabled: true },
          guards: [GqlAuthGuard],
        },
      ],
    }),
  ],
  providers: [
    ChatSubscriptionService,
    ChatResolver,
    RedisPubSubProvider.provider(),
  ],
})
export class ChatModule {}
