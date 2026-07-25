import { DynamicModule, Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { existsSync, promises as fs } from 'fs';

import { RiderModule } from '../rider/rider.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthVerifierModule } from '@kasi/database';
import { getRiderJwtSecret } from './jwt-secret';

@Module({})
export class AuthModule {
  static async register(): Promise<DynamicModule> {
    const authVerifierModule = await AuthVerifierModule.register();
    const modules = [
      RiderModule,
      PassportModule,
      JwtModule.register({
        secret: getRiderJwtSecret(),
      }),
      authVerifierModule,
    ];

    // Les providers sont desormais enregistres INCONDITIONNELLEMENT.
    //
    // Avant, ils ne l'etaient que si `config/config.$NODE_ENV.json` existait et
    // referencait une cle Firebase presente. Sinon `providers` restait vide, ce
    // qui avait trois consequences silencieuses et severes :
    //   - `AuthResolver` absent -> les operations `login`, `skipVerification` et
    //     `requireUpdate` DISPARAISSAIENT du schema, donc la query
    //     `GetCurrentOrder` du mobile (qui selectionne `requireUpdate`) echouait
    //     entierement a la validation ;
    //   - `JwtStrategy` absent -> toute query gardee levait « Unknown
    //     authentication strategy "jwt" » ;
    //   - aucun message d'erreur : le serveur demarrait normalement.
    // Seul `config.production.json` existe dans le depot : un `nx serve` avec
    // NODE_ENV=development suffisait donc a supprimer toute l'authentification.
    //
    // `AuthService` ne depend que de `PHONE_AUTH_VERIFIER`, toujours fourni
    // (Firebase ou NoOp). Firebase non configure produit maintenant une erreur
    // explicite *sur l'appel a login*, plus une mutilation du schema au demarrage.
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    let firebaseConfigured = false;
    if (existsSync(configAddress)) {
      const file = await fs.readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      firebaseConfigured =
        config.firebaseProjectPrivateKey != null &&
        existsSync(`${process.cwd()}/config/${config.firebaseProjectPrivateKey}`);
    }
    if (firebaseConfigured) {
      Logger.log('Firebase Auth Module initialized', 'AuthModule');
    } else {
      Logger.error(
        `Firebase n'est PAS configure (${configAddress} introuvable ou cle de ` +
          `service absente). Le schema GraphQL reste complet, mais la mutation ` +
          `login echouera a chaque appel. Verifiez NODE_ENV et le volume config/.`,
        'AuthModule',
      );
    }

    return {
      module: AuthModule,
      imports: modules,
      providers: [AuthService, JwtStrategy, AuthResolver],
    };
  }
}
