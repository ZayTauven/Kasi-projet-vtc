import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { PayoutMethodEntity } from '@kasi/database/payout-method.entity';
import { PayoutSessionEntity } from '@kasi/database/payout-session.entity';
import { PayoutEntity } from '@kasi/database/payout.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PayoutMethodDTO } from './dto/payout-method.dto';
import { PayoutMethodInput } from './dto/payout-method.input';
import { PayoutSessionDTO } from './dto/payout-session.dto';
import { PayoutDTO } from './dto/payout.dto';
import { PayoutResolver } from './payout.resolver';
import { PayoutService } from './payout.service';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          PayoutMethodEntity,
          PayoutSessionEntity,
          PayoutEntity,
          DriverEntity,
          DriverWalletEntity,
          DriverTransactionEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: PayoutMethodEntity,
          DTOClass: PayoutMethodDTO,
          CreateDTOClass: PayoutMethodInput,
          UpdateDTOClass: PayoutMethodInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          // Créées uniquement via createPayoutSession (PayoutResolver).
          EntityClass: PayoutSessionEntity,
          DTOClass: PayoutSessionDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          // Gérés via processPayout / cancelPayout (PayoutResolver).
          EntityClass: PayoutEntity,
          DTOClass: PayoutDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [PayoutResolver, PayoutService],
})
export class PayoutModule {}
