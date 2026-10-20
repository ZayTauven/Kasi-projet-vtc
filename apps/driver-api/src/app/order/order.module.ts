import { NestjsQueryGraphQLModule } from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisPubSubProvider } from '@kasi/database';
import { ShiftRuleEntity } from '@kasi/database/shift-rule.entity';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { ProviderTransactionEntity } from '@kasi/database/provider-transaction.entity';
import { ProviderWalletEntity } from '@kasi/database/provider-wallet.entity';
import { RiderEntity } from '@kasi/database/rider-entity';
import { RiderTransactionEntity } from '@kasi/database/rider-transaction.entity';
import { RiderWalletEntity } from '@kasi/database/rider-wallet.entity';
import { ServiceCategoryEntity } from '@kasi/database/service-category.entity';
import { ServiceEntity } from '@kasi/database/service.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { FirebaseNotificationModule } from '@kasi/order/firebase-notification-service/firebase-notification-service.module';
import { GoogleServicesModule } from '@kasi/order/google-services/google-services.module';
import { SharedOrderService } from '@kasi/order/shared-order.service';
import { CallMaskingModule } from '@kasi/order/call-masking.module';
import { SharedProviderService } from '@kasi/order/shared-provider.service';
import { SharedFleetService } from '@kasi/order/shared-fleet.service';
import { RegionModule } from '@kasi/order/region/region.module';
import { RoutingModule } from '@kasi/order/routing/routing.module';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { ServiceService } from '@kasi/order/service.service';
import { FareQuoteService } from '@kasi/order/fare-quote.service';
import { FareQuoteEntity } from '@kasi/database/fare-quote.entity';

import { OrderDTO } from './dto/order.dto';
import { OrderResolver } from './order.resolver';
import { DriverOrderQueryService } from './driver-order.query-service';
import { RedisHelpersModule } from '@kasi/redis/redis-helper.module';
import { CronJobService } from './cron-job.service';
import { DriverModule } from '../driver/driver.module';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { OrderService } from './order.service';
import { FleetWalletEntity } from '@kasi/database/fleet-wallet.entity';
import { FleetTransactionEntity } from '@kasi/database/fleet-transaction.entity';
import { OrderSubscriptionService } from './order-subscription.service';
import { RiderDTO } from './dto/rider.dto';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { FleetEntity } from '@kasi/database/fleet.entity';
import { ServiceOptionEntity } from '@kasi/database/service-option.entity';
import { CommonCouponModule } from '@kasi/coupon/common-coupon.module';
import { ZonePriceEntity } from '@kasi/database/zone-price.entity';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { dispatchQueueOptions } from '../dispatch/dispatch-queue';
import { DispatchTickProcessor } from '../dispatch/dispatch-tick.processor';
import { DispatchWaveService } from '../dispatch/dispatch-wave.service';
import { DispatchAttemptJournal } from '../dispatch/dispatch-attempt.journal';
import { UnservedDemandService } from '../dispatch/unserved-demand.service';
import { DispatchProducer } from '@kasi/order/dispatch-producer.service';
import { DriverDocumentService } from '@kasi/order/driver-document.service';
import { KycCheckService } from '../kyc/kyc-check.service';

@Module({
  imports: [
    // p2-dispatch D1 : file kasi-dispatch (battement du cron, puis vagues en D2).
    BullModule.registerQueue(dispatchQueueOptions),
    RedisHelpersModule,
    DriverModule,
    CommonCouponModule,
    CallMaskingModule,
    TypeOrmModule.forFeature([
      RequestEntity,
      ServiceCategoryEntity,
      ServiceOptionEntity,
      ServiceEntity,
      RiderEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
      DriverEntity,
      DriverWalletEntity,
      DriverTransactionEntity,
      ProviderWalletEntity,
      ProviderTransactionEntity,
      FleetEntity,
      FleetWalletEntity,
      FleetTransactionEntity,
      ZonePriceEntity,
      PaymentEntity,
      ShiftRuleEntity,
      // p2-argent I4 (2026-10-20) : devis fige (dependance de SharedOrderService).
      FareQuoteEntity,
    ]),
    RegionModule,
    RoutingModule,
    HttpModule,
    FirebaseNotificationModule.register(),
    GoogleServicesModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          RequestEntity,
          RiderEntity,
          RequestActivityEntity,
        ]),
      ],
      pubSub: RedisPubSubProvider.provider(),
      dtos: [{ DTOClass: OrderDTO }],
      resolvers: [
        {
          DTOClass: RiderDTO,
          EntityClass: RiderEntity,
          read: { disabled: true },
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
        },
      ],
    }),
  ],
  providers: [
    OrderSubscriptionService,
    SharedOrderService,
    DriverOrderQueryService,
    OrderResolver,
    OrderService,
    ServiceService,
    SharedRiderService,
    SharedDriverService,
    SharedProviderService,
    SharedFleetService,
    FareQuoteService,
    RedisPubSubProvider.provider(),
    CronJobService,
    DispatchTickProcessor,
    // p2-dispatch D2-D3 : vagues et expiration par course (consommateur),
    // producteur requis par SharedOrderService.
    DispatchWaveService,
    DispatchProducer,
    // p2-dispatch D4-D6 : journal des sollicitations, demande non servie.
    DispatchAttemptJournal,
    UnservedDemandService,
    // p2-kyc K1 : controle des documents (job kyc-check du meme consommateur).
    DriverDocumentService,
    KycCheckService,
  ],
  exports: [DriverOrderQueryService, SharedDriverService],
})
export class OrderModule {}
