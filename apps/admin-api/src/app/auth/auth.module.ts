import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { OperatorModule } from '../operator/operator.module';

import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { getAdminJwtSecret } from './jwt-secret';

@Module({
  imports: [
    OperatorModule,
    PassportModule,
    JwtModule.register({
      secret: getAdminJwtSecret(),
    }),
  ],
  providers: [JwtStrategy, AuthService, AuthResolver],
})
export class AuthModule {}
