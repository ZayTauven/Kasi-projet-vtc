import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService, DatabaseModule, entities } from '@kasi/database';
import { RedisModule } from '@songkeys/nestjs-redis';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { validateToken } from './auth/jwt.strategy';
import { DriverAPIController } from './driver-api.controller';
import { DriverModule } from './driver/driver.module';
import { OrderModule } from './order/order.module';
import { UploadModule } from './upload/upload.module';
import { AnnouncementsModule } from './announcemnts/announcements.module';
import { WalletModule } from './wallet/wallet.module';
import { ServiceModule } from './service/service.module';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { ChatModule } from './chat/chat.module';
import { ComplaintModule } from './complaint/complaint.module';
import { SOSModule } from './sos/sos.module';
import { ShiftRuleModule } from './shift-rule/shift-rule.module';
import { MapSettingModule } from './map-setting/map-setting.module';
import { KycModule } from './kyc/kyc.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { BullModule } from '@nestjs/bullmq';
import { bullRootOptions } from './dispatch/dispatch-queue';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { KasiMonitoringFilter } from '@kasi/monitoring/monitoring.filter';

@Module({
  imports: [
    // p1-sentry : erreurs des API vers le suivi des erreurs (sans DSN : aucun envoi).
    SentryModule.forRoot(),
    DatabaseModule,
    ServiceModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    // p2-dispatch D1 (bs-act-bullmq) : BullMQ sur le Redis existant, prefixe kasi-bull.
    BullModule.forRoot(bullRootOptions()),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // cors: false,
      subscriptions: {
        'subscriptions-transport-ws': {
          keepAlive: 5000,
          onConnect: async (connectionParams: { authToken: string }) => {
            if (connectionParams.authToken) {
              return validateToken(connectionParams.authToken);
            }
            throw new Error('Missing auth token!');
          },
        },
      },
      autoSchemaFile: join(process.cwd(), 'apps/driver-app/lib/schema.gql'),
      buildSchemaOptions: {
        dateScalarMode: 'timestamp',
      },
      // context: ({ req, res, payload, connection }) => ({
      //   req,
      //   res,
      //   payload,
      //   connection,
      // }),
    }),
    TypeOrmModule.forFeature(entities),
    AuthModule.register(),
    UploadModule,
    DriverModule,
    ChatModule,
    OrderModule,
    WalletModule,
    RedisModule.forRoot({
      closeClient: true,
      commonOptions: { db: 2 },
      config: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    AnnouncementsModule,
    ComplaintModule,
    SOSModule,
    ShiftRuleModule,
    MapSettingModule,
    // p2-kyc K1 (2026-10-20) : documents types du Kasiman.
    KycModule,
  ],
  controllers: [DriverAPIController],
  providers: [
    CryptoService,
    SharedDriverService,
    { provide: APP_FILTER, useClass: KasiMonitoringFilter },
  ],
})
export class DriverAPIModule {}
