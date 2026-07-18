import { Logger, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, entities, RedisPubSubProvider } from '@kasi/database';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { RiderAPIController } from './rider-api.controller';
import { RiderModule } from './rider/rider.module';
import { UploadModule } from './upload/upload.module';
import { ServiceModule } from './service/service.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { WalletModule } from './wallet/wallet.module';
import { CouponModule } from './coupon/coupon.module';
import { RedisModule } from '@songkeys/nestjs-redis';
import { validateToken } from './auth/jwt.strategy';
import { CryptoService } from '@kasi/database';
import { ChatModule } from './chat/chat.module';
import { ComplaintModule } from './complaint/complaint.module';
import { SharedOrderModule } from '@kasi/order/shared-order.module';
import { CallMaskingModule } from '@kasi/order/call-masking.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { SOSModule } from './sos/sos.module';
import { GeoModule } from './geo/geo.module';
import { MapSettingModule } from './map-setting/map-setting.module';

@Module({
  imports: [
    DatabaseModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      installSubscriptionHandlers: true,
      // cors: false,
      // context: ({ connection, req, res, extra }) => {
      //   return extra && extra.user
      //     ? {
      //         req: req,
      //         res: res,
      //         user: extra.user,
      //       }
      //     : { req: req, res: res };
      // },
      autoSchemaFile: join(process.cwd(), 'apps/rider-app/lib/schema.gql'),
      buildSchemaOptions: {
        dateScalarMode: 'timestamp',
      },
      // context: ({ req, res, payload, connection }) => {
      //   return {
      //     req,
      //     res,
      //     payload,
      //     connection,
      //   };
      // },
      subscriptions: {
        'subscriptions-transport-ws': {
          keepAlive: 5000,
          onConnect: async (connectionParams: any) => {
            Logger.log('connectionParams', connectionParams);
            if (connectionParams.authToken) {
              return validateToken(connectionParams.authToken);
            }
            throw new Error('Missing auth token!');
          },
        },
        // 'graphql-ws': {
        //   onConnect: async (context: WSContext) => {
        //     Logger.log('connectionParams', context);
        //     const { connectionParams, extra } = context;
        //     if (connectionParams.authToken) {
        //       Logger.log(
        //         `connection established with token ${connectionParams.authToken}`,
        //         'GraphQL'
        //       );
        //       const userObject = await validateToken(
        //         connectionParams!.authToken as string
        //       );
        //       Logger.log(
        //         `userObject: ${JSON.stringify(userObject)}`,
        //         'GraphQL'
        //       );
        //       extra['user'] = userObject;
        //       return;
        //     }
        //     throw new Error('Missing auth token!');
        //   },
        //   onDisconnect: () => {
        //     Logger.log('connection disconnected', 'GraphQL');
        //   },
        //   onSubscribe: (context) => {
        //     Logger.log(`subscription started`, 'GraphQL');
        //   },
        // },
      },
    }),
    TypeOrmModule.forFeature(entities),
    AuthModule.register(),
    UploadModule,
    RiderModule,
    ServiceModule,
    OrderModule,
    AddressModule,
    AnnouncementModule,
    GeoModule,
    SharedOrderModule,
    ComplaintModule,
    SOSModule,
    WalletModule,
    CouponModule,
    ConfigModule,
    CallMaskingModule,
    MapSettingModule,
    RedisModule.forRoot({
      closeClient: true,
      commonOptions: { db: 2 },
      config: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    ChatModule,
  ],
  providers: [CryptoService, RedisPubSubProvider.provider()],
  controllers: [RiderAPIController],
})
export class RiderAPIModule {}
