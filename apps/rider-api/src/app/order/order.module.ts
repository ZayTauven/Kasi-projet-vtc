import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisPubSubProvider } from '@kasi/database';
import { CarColorEntity } from '@kasi/database/car-color.entity';
import { CarModelEntity } from '@kasi/database/car-model.entity';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { ProviderTransactionEntity } from '@kasi/database/provider-transaction.entity';
import { ProviderWalletEntity } from '@kasi/database/provider-wallet.entity';
import { RegionEntity } from '@kasi/database/region.entity';
import { ServiceCategoryEntity } from '@kasi/database/service-category.entity';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { FirebaseNotificationModule } from '@kasi/order/firebase-notification-service/firebase-notification-service.module';
import { GoogleServicesModule } from '@kasi/order/google-services.module';
import { SharedProviderService } from '@kasi/order/shared-provider.service';
import { RegionModule } from '@kasi/order/region.module';
import { RedisHelpersModule } from '@kasi/redis/redis-helper.module';

import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { RiderModule } from '../rider/rider.module';
import { ServiceModule } from '../service/service.module';
import { CarColorDTO } from './dto/car-color.dto';
import { CarModelDTO } from './dto/car-model.dto';
import { DriverDTO } from './dto/driver.dto';
import { OrderDTO } from './dto/order.dto';
import { OrderResolver } from './order.resolver';
import { RiderOrderService } from './rider-order.service';
import { FeedbackEntity } from '@kasi/database/feedback.entity';
import { OrderSubscriptionService } from './order-subscription.service';
import { MediaEntity } from '@kasi/database/media.entity';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { SharedOrderModule } from '@kasi/order/shared-order.module';
import { CouponModule } from '../coupon/coupon.module';
import { FeedbackParameterEntity } from '@kasi/database/feedback-parameter.entity';
import { FeedbackParameterDTO } from './dto/feedback-parameter.dto';
import { ServiceOptionEntity } from '@kasi/database/service-option.entity';
import { UpdateOrderInput } from './dto/update-order.input';
import { RiderOrderQueryService } from './rider-order.query-service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { CommonCouponModule } from '@kasi/coupon/common-coupon.module';
import { ZonePriceEntity } from '@kasi/database/zone-price.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestEntity,
      ProviderWalletEntity,
      ProviderTransactionEntity,
      DriverEntity,
      DriverWalletEntity,
      DriverTransactionEntity,
      FeedbackEntity,
      RequestActivityEntity,
      FeedbackParameterEntity,
      ServiceOptionEntity,
      ZonePriceEntity,
      PaymentEntity,
    ]),
    HttpModule,
    CommonCouponModule,
    GoogleServicesModule,
    ServiceModule,
    RiderModule,
    RegionModule,
    forwardRef(() => CouponModule),
    RedisHelpersModule,
    SharedOrderModule,
    FirebaseNotificationModule.register(),
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          RequestEntity,
          DriverEntity,
          CarColorEntity,
          CarModelEntity,
          RegionEntity,
          ServiceCategoryEntity,
          MediaEntity,
          FeedbackParameterEntity,
          RequestActivityEntity,
          FeedbackEntity,
          PaymentEntity,
        ]),
        CommonCouponModule,
        SharedOrderModule,
        HttpModule,
        FirebaseNotificationModule.register(),
      ],
      pubSub: RedisPubSubProvider.provider(),
      services: [
        RiderOrderQueryService,
        RiderOrderService,
        OrderRedisService,
      ],
      resolvers: [
        {
          EntityClass: RequestEntity,
          DTOClass: OrderDTO,
          UpdateDTOClass: UpdateOrderInput,
          ServiceClass: RiderOrderQueryService,
          //Service: RiderOrderQueryService,
          create: { disabled: true },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          guards: [GqlAuthGuard],
        },
        {
          EntityClass: DriverEntity,
          DTOClass: DriverDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          read: { disabled: true },
        },
        {
          EntityClass: CarModelEntity,
          DTOClass: CarModelDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          read: { disabled: true },
        },
        {
          EntityClass: CarColorEntity,
          DTOClass: CarColorDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          read: { disabled: true },
        },
        {
          EntityClass: FeedbackParameterEntity,
          DTOClass: FeedbackParameterDTO,
          pagingStrategy: PagingStrategies.NONE,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          read: { one: { disabled: true } },
        },
      ],
    }),
  ],
  providers: [
    OrderSubscriptionService,
    SharedProviderService,
    OrderResolver,
    RiderOrderService,
    SharedDriverService,
    RedisPubSubProvider.provider(),
  ],
  exports: [RiderOrderService],
})
export class OrderModule {}
