import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CarColorEntity } from './entities/car-color.entity';
import { CarModelEntity } from './entities/car-model.entity';
import { ComplaintActivityEntity } from './entities/complaint-activity.entity';
import { ComplaintEntity } from './entities/complaint.entity';
import { CouponEntity } from './entities/coupon.entity';
import { DriverTransactionEntity } from './entities/driver-transaction.entity';
import { DriverWalletEntity } from './entities/driver-wallet.entity';
import { DriverEntity } from './entities/driver.entity';
import { FeedbackParameterEntity } from './entities/feedback-parameter.entity';
import { FeedbackEntity } from './entities/feedback.entity';
import { FleetTransactionEntity } from './entities/fleet-transaction.entity';
import { FleetWalletEntity } from './entities/fleet-wallet.entity';
import { FleetEntity } from './entities/fleet.entity';
import { MediaEntity } from './entities/media.entity';
import { OperatorRoleEntity } from './entities/operator-role.entity';
import { OperatorEntity } from './entities/operator.entity';
import { OrderMessageEntity } from './entities/request-message.entity';
import { RequestEntity } from './entities/request.entity';
import { PaymentGatewayEntity } from './entities/payment-gateway.entity';
import { ProviderTransactionEntity } from './entities/provider-transaction.entity';
import { ProviderWalletEntity } from './entities/provider-wallet.entity';
import { RegionEntity } from './entities/region.entity';
import { RiderAddressEntity } from './entities/rider-address.entity';
import { RiderEntity } from './entities/rider-entity';
import { RiderTransactionEntity } from './entities/rider-transaction.entity';
import { RiderWalletEntity } from './entities/rider-wallet.entity';
import { ServiceCategoryEntity } from './entities/service-category.entity';
import { ServiceEntity } from './entities/service.entity';
import { PaymentEntity } from './entities/payment.entity';
import { ServiceOptionEntity } from './entities/service-option.entity';
import { GiftCardEntity } from './entities/gift-card.entity';
import { SOSEntity } from './entities/sos.entity';
import { SOSActivityEntity } from './entities/sos-activity.entity';
import { AnnouncementEntity } from './entities/announcement.entity';
import { ZonePriceEntity } from './entities/zone-price.entity';
import { GatewayToUserEntity } from './entities/gateway-to-user.entity';
import { FleetDeviceEntity } from './entities/fleet-device.entity';
import { OrderCancelReasonEntity } from './entities/order-cancel-reason.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        Logger.log('TypeORM import started');
        const dbName = process.env.DB_NAME || 'kasi';
        const baseConfig = {
          type: 'postgres' as const,
          host: process.env.DB_HOST || 'localhost',
          port: 5432 as const,
          username: process.env.DB_USER || 'root',
          password: process.env.DB_PASS || 'defaultpassword',
        };

        // Connect to the 'postgres' system database to check / create the target database
        const initSource = new DataSource({ ...baseConfig, database: 'postgres' });
        await initSource.initialize();
        const dbCheck: unknown[] = await initSource.query(
          `SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1`,
          [dbName],
        );
        const dbExists = dbCheck.length > 0;
        if (!dbExists) {
          await initSource.query(`CREATE DATABASE "${dbName}"`);
        }
        await initSource.destroy();

        // Connect to the target database: activate PostGIS, measure table count
        const setupSource = new DataSource({ ...baseConfig, database: dbName });
        await setupSource.initialize();
        await setupSource.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
        const tables: unknown[] = await setupSource.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = $1`,
          [dbName],
        );
        const shouldSync = tables.length < 5 || process.env.FORCE_SYNC_DB != null;
        await setupSource.destroy();

        Logger.log('TypeORM import finished');
        return {
          ...baseConfig,
          database: dbName,
          autoLoadEntities: true,
          migrations: [`${__dirname}/migration/*.js`],
          synchronize: shouldSync,
          migrationsRun: false,
          logging: true,
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class DatabaseModule {}

export const entities = [
  MediaEntity,
  OperatorEntity,
  OperatorRoleEntity,
  DriverEntity,
  ProviderTransactionEntity,
  ProviderWalletEntity,
  ComplaintActivityEntity,
  ComplaintEntity,
  CarModelEntity,
  CarColorEntity,
  DriverTransactionEntity,
  DriverWalletEntity,
  FeedbackParameterEntity,
  FeedbackEntity,
  FleetEntity,
  FleetWalletEntity,
  FleetTransactionEntity,
  FleetDeviceEntity,
  RequestEntity,
  OrderMessageEntity,
  OrderCancelReasonEntity,
  PaymentGatewayEntity,
  PaymentEntity,
  ServiceEntity,
  ServiceCategoryEntity,
  CouponEntity,
  RegionEntity,
  RiderEntity,
  RiderWalletEntity,
  RiderTransactionEntity,
  RiderAddressEntity,
  ServiceOptionEntity,
  GiftCardEntity,
  SOSEntity,
  SOSActivityEntity,
  AnnouncementEntity,
  ZonePriceEntity,
  GatewayToUserEntity,
];
