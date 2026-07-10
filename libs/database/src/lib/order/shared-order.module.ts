import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonCouponModule } from '@kasi/coupon/common-coupon.module';
import { RedisPubSubProvider } from '@kasi/database';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { FleetTransactionEntity } from '@kasi/database/fleet-transaction.entity';
import { FleetWalletEntity } from '@kasi/database/fleet-wallet.entity';
import { FleetEntity } from '@kasi/database/fleet.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { ProviderTransactionEntity } from '@kasi/database/provider-transaction.entity';
import { ProviderWalletEntity } from '@kasi/database/provider-wallet.entity';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { RiderEntity } from '@kasi/database/rider-entity';
import { RiderTransactionEntity } from '@kasi/database/rider-transaction.entity';
import { RiderWalletEntity } from '@kasi/database/rider-wallet.entity';
import { ServiceCategoryEntity } from '@kasi/database/service-category.entity';
import { ServiceOptionEntity } from '@kasi/database/service-option.entity';
import { ServiceEntity } from '@kasi/database/service.entity';
import { ZonePriceEntity } from '@kasi/database/zone-price.entity';
import { RedisHelpersModule } from '@kasi/redis/redis-helper.module';
import { SharedConfigurationService } from '../shared-configuration.service';
import { FirebaseNotificationModule } from './firebase-notification-service/firebase-notification-service.module';
import { GoogleServicesModule } from './google-services/google-services.module';
import { RegionModule } from './region/region.module';
import { ServiceService } from './service.service';
import { SharedDriverService } from './shared-driver.service';
import { SharedFleetService } from './shared-fleet.service';
import { SharedOrderService } from './shared-order.service';
import { SharedProviderService } from './shared-provider.service';
import { SharedRiderService } from './shared-rider.service';

@Module({
  imports: [
    RedisHelpersModule,
    CommonCouponModule,
    TypeOrmModule.forFeature([
      ServiceCategoryEntity,
      ServiceOptionEntity,
      ServiceEntity,
      RiderEntity,
      DriverEntity,
      DriverWalletEntity,
      DriverTransactionEntity,
      FleetEntity,
      FleetWalletEntity,
      FleetTransactionEntity,
      ProviderWalletEntity,
      ProviderTransactionEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
      RequestEntity,
      RequestActivityEntity,
      ZonePriceEntity,
      PaymentEntity,
    ]),
    HttpModule,
    RegionModule,
    GoogleServicesModule,
    FirebaseNotificationModule.register(),
  ],
  providers: [
    RedisPubSubProvider.provider(),
    ServiceService,
    SharedDriverService,
    SharedFleetService,
    SharedOrderService,
    SharedProviderService,
    SharedRiderService,
    SharedConfigurationService,
  ],
  exports: [
    SharedDriverService,
    SharedFleetService,
    SharedOrderService,
    SharedProviderService,
    SharedRiderService,
  ],
})
export class SharedOrderModule {}
