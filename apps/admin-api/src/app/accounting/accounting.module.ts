import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestEntity } from '@kasi/database/request.entity';
import { ProviderTransactionEntity } from '@kasi/database/provider-transaction.entity';
import { ProviderWalletEntity } from '@kasi/database/provider-wallet.entity';

import { AccountingResolver } from './accounting.resolver';
import { AccountingService } from './accounting.service';
import { ProviderTransactionDTO } from './dto/provider-transaction.dto';
import { ProviderWalletDTO } from './dto/provider-wallet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverEntity } from '@kasi/database/driver.entity';
import { RiderEntity } from '@kasi/database/rider-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderTransactionEntity,
      RequestEntity,
      DriverEntity,
      RiderEntity,
    ]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          ProviderTransactionEntity,
          ProviderWalletEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: ProviderTransactionEntity,
          DTOClass: ProviderTransactionDTO,
          // p2-argent I1 (2026-10-19) : createOneProviderTransaction retiree
          // (fiche §8.5) : elle inserait une ligne sans toucher au solde ni a
          // la cle. Operations manuelles : mutations sur mesure avec permission.
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: ProviderWalletEntity,
          DTOClass: ProviderWalletDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.NONE,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [AccountingService, AccountingResolver],
})
export class AccountingModule {}
