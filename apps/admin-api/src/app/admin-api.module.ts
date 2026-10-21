import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, entities } from '@kasi/database';
import { join } from 'path';
import { Context as WSContext } from 'graphql-ws';
import { AccountingModule } from './accounting/accounting.module';
import { AddressModule } from './address/address.module';
import { AppController } from './admin-api.controller';
import { AnnouncementModule } from './announcement/announcement.module';
import { CarModule } from './car/car.module';
import { CouponModule } from './coupon/coupon.module';
import { DriverModule } from './driver/driver.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FleetModule } from './fleet/fleet.module';
import { OperatorModule } from './operator/operator.module';
import { OrderModule } from './order/order.module';
import { PaymentGatewayModule } from './payment-gateway/payment-gateway.module';
import { RegionModule } from './region/region.module';
import { RiderModule } from './rider/rider.module';
import { ServiceModule } from './service/service.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { ComplaintModule } from './complaint/complaint.module';
import { existsSync, promises as fs } from 'fs';
import { ConfigurationModule } from './config/configuration.module';
import { UploadService } from './upload/upload.service';
import { RedisModule } from '@songkeys/nestjs-redis';
import { validateToken } from './auth/jwt.strategy';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SOSModule } from './sos/sos.module';
import { RewardModule } from './reward/reward.module';
import { PayoutModule } from './payout/payout.module';
import { SmsProviderModule } from './sms-provider/sms-provider.module';
import { EmailProviderModule } from './email-provider/email-provider.module';
import { CallMaskingProviderModule } from './call-masking-provider/call-masking-provider.module';
import { GiftModule } from './gift/gift.module';
import { ShiftRuleModule } from './shift-rule/shift-rule.module';
import { RetentionPolicyModule } from './retention-policy/retention-policy.module';
import { MapSettingModule } from './map-setting/map-setting.module';
import { LedgerModule } from './ledger/ledger.module';
import { MoneyPolicyModule } from './money-policy/money-policy.module';
import { DispatchJournalModule } from './dispatch/dispatch-journal.module';
import { KycModule } from './kyc/kyc.module';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { KasiMonitoringFilter } from '@kasi/monitoring/monitoring.filter';

@Module({})
export class AdminAPIModule {
  static async register(): Promise<DynamicModule> {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    Logger.log(`Config address: ${configAddress}`);
    if (existsSync(configAddress)) {
      const file = await fs.readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      const firebaseKeyFileAddress = `${process.cwd()}/config/${
        config.firebaseProjectPrivateKey
      }`;
      if (
        config.firebaseProjectPrivateKey != null &&
        existsSync(firebaseKeyFileAddress)
      ) {
        // Kasi migration: Ridy phone-home licensing check removed.
        // Full module loads unconditionally once Firebase is configured.
        return {
          module: AdminAPIModule,
          imports: [
            // p1-sentry : erreurs vers le suivi des erreurs (sans DSN : aucun envoi).
            SentryModule.forRoot(),
            DatabaseModule,
            GraphQLModule.forRoot<ApolloDriverConfig>({
              driver: ApolloDriver,
              // socle-securite (2026-10-20) : pas de pile d'appels dans les reponses
              // (chemins internes du serveur) ; elle reste dans les journaux.
              includeStacktraceInErrorResponses: false,
              context: ({ connection, req, res, extra }) => {
                return extra && extra.user
                  ? {
                      req: req,
                      res: res,
                      user: extra.user,
                    }
                  : { req: req, res: res };
              },
              subscriptions: {
                'graphql-ws': {
                  //keepAlive: 5000,
                  onConnect: async (context: WSContext) => {
                    const { connectionParams, extra } = context;
                    if (connectionParams.authToken) {
                      const userObject = await validateToken(
                        connectionParams!.authToken as string,
                      );
                      // p1-sentry (hygiene des journaux) : ni jeton ni
                      // contenu du jeton, l'identifiant de l'operateur suffit.
                      Logger.log(
                        `connexion WebSocket de l'operateur ${(userObject as { id?: number })?.id ?? '?'}`,
                        'GraphQL',
                      );
                      extra['user'] = userObject;
                      return;
                    }
                    throw new Error('Missing auth token!');
                  },
                  onDisconnect: () => {
                    Logger.log('connection disconnected', 'GraphQL');
                  },
                  onSubscribe: (context) => {
                    Logger.log(`subscription started`, 'GraphQL');
                  },
                },
              },
              autoSchemaFile: join(process.cwd(), 'admin.schema.gql'),
              // cors: false,
            }),
            TypeOrmModule.forFeature(entities),
            ServiceModule,
            OperatorModule,
            RiderModule,
            DriverModule,
            FleetModule,
            OrderModule,
            AnnouncementModule,
            CouponModule,
            AccountingModule,
            RegionModule,
            PaymentGatewayModule,
            CarModule,
            FeedbackModule,
            AddressModule,
            AuthModule,
            UploadModule,
            SOSModule,
            RewardModule,
            PayoutModule,
            SmsProviderModule,
            EmailProviderModule,
            CallMaskingProviderModule,
            GiftModule,
            ShiftRuleModule,
            RetentionPolicyModule,
            MapSettingModule,
            ComplaintModule,
            // p2-argent I2 (2026-10-19) : ledgerIntegrityReport et balayage quotidien.
            LedgerModule,
            MoneyPolicyModule,
            // p2-dispatch D4 et D6 (2026-10-20) : journal du dispatch, demande non servie.
            DispatchJournalModule,
            // p2-kyc K1 (2026-10-20) : documents types du Kasiman.
            KycModule,
            ConfigurationModule,
            HttpModule,
            RedisModule.forRoot({
              closeClient: true,
              commonOptions: { db: 2 },
              config: {
                host: process.env.REDIS_HOST ?? 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
              },
            }),
          ],
          providers: [
            UploadService,
            { provide: APP_FILTER, useClass: KasiMonitoringFilter },
          ],
          controllers: [AppController],
        };
      }
    }
    return {
      module: AdminAPIModule,
      imports: [
        SentryModule.forRoot(),
        HttpModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          // socle-securite (2026-10-20) : pas de pile d'appels dans les reponses
          // (chemins internes du serveur) ; elle reste dans les journaux.
          includeStacktraceInErrorResponses: false,
          autoSchemaFile: true,
          // cors: false,
          //uploads: false,
        }),
        ConfigurationModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: KasiMonitoringFilter }],
    };
  }
}
