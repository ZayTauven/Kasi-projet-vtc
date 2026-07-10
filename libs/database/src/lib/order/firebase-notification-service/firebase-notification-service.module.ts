import { DynamicModule, Logger, Module } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';

import { FirebaseDriverNotificationService } from './driver-notification.service';
import { FirebaseRiderNotificationService } from './rider-notification.service';
import { NoOpDriverNotificationService } from '../interfaces/noop-driver-notification.service';
import { NoOpRiderNotificationService } from '../interfaces/noop-rider-notification.service';
import { DRIVER_NOTIFICATION_SERVICE } from '../interfaces/driver-notification.interface';
import { RIDER_NOTIFICATION_SERVICE } from '../interfaces/rider-notification.interface';

@Module({})
export class FirebaseNotificationModule {
  static register(): DynamicModule {
    let firebaseConfigExists = false;

    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    Logger.log('configAddress: ' + configAddress, 'FirebaseNotificationModule');
    if (existsSync(configAddress)) {
      const file = readFileSync(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      const firebaseKeyFileAddress = `${process.cwd()}/config/${
        config.firebaseProjectPrivateKey
      }`;
      if (
        config.firebaseProjectPrivateKey != null &&
        existsSync(firebaseKeyFileAddress)
      ) {
        firebaseConfigExists = true;
      }
    }

    if (!firebaseConfigExists) {
      Logger.warn(
        'Firebase config not found — using NoOp notification services.',
        'FirebaseNotificationModule',
      );
    }

    const providers = [
      {
        provide: DRIVER_NOTIFICATION_SERVICE,
        useClass: firebaseConfigExists
          ? FirebaseDriverNotificationService
          : NoOpDriverNotificationService,
      },
      {
        provide: RIDER_NOTIFICATION_SERVICE,
        useClass: firebaseConfigExists
          ? FirebaseRiderNotificationService
          : NoOpRiderNotificationService,
      },
    ];

    return {
      module: FirebaseNotificationModule,
      imports: [],
      providers: providers,
      exports: [DRIVER_NOTIFICATION_SERVICE, RIDER_NOTIFICATION_SERVICE],
    };
  }
}
