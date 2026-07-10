import { DynamicModule, Logger, Module, Type } from '@nestjs/common';
import { existsSync, promises as fs } from 'fs';
import { FirebasePhoneAuthVerifier } from './firebase-phone-auth-verifier.service';
import { NoOpPhoneAuthVerifier } from './noop-phone-auth-verifier.service';
import {
  IPhoneAuthVerifier,
  PHONE_AUTH_VERIFIER,
} from './interfaces/phone-auth-verifier.interface';

@Module({})
export class AuthVerifierModule {
  static async register(): Promise<DynamicModule> {
    const configAddress = `${process.cwd()}/config/config.${process.env.NODE_ENV ?? 'production'}.json`;

    let providerClass: Type<IPhoneAuthVerifier> = NoOpPhoneAuthVerifier;

    if (existsSync(configAddress)) {
      const file = await fs.readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      if (
        config.firebaseProjectPrivateKey != null &&
        existsSync(
          `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
        )
      ) {
        Logger.log('FirebasePhoneAuthVerifier selected', 'AuthVerifierModule');
        providerClass = FirebasePhoneAuthVerifier;
      } else {
        Logger.log(
          'NoOpPhoneAuthVerifier selected (Firebase not configured)',
          'AuthVerifierModule',
        );
      }
    } else {
      Logger.log(
        'NoOpPhoneAuthVerifier selected (no config file)',
        'AuthVerifierModule',
      );
    }

    return {
      module: AuthVerifierModule,
      providers: [
        {
          provide: PHONE_AUTH_VERIFIER,
          useClass: providerClass,
        },
      ],
      exports: [PHONE_AUTH_VERIFIER],
    };
  }
}
