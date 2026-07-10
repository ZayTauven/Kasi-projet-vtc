import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { RiderAddressEntity } from '@kasi/database/rider-address.entity';
import { RiderEntity } from '@kasi/database/rider-entity';
import { RiderTransactionEntity } from '@kasi/database/rider-transaction.entity';
import { RiderWalletEntity } from '@kasi/database/rider-wallet.entity';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderAddressDTO } from './dto/rider-address.dto';

import { RiderTransactionDTO } from './dto/rider-transaction.dto';
import { RiderWalletDTO } from './dto/rider-wallet.dto';
import { RiderDTO } from './dto/rider.dto';
import { RiderResolver } from './rider.resolver';
import { RiderInput } from './dto/rider.input';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          RiderEntity,
          RiderWalletEntity,
          RiderTransactionEntity,
          RiderAddressEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: RiderEntity,
          DTOClass: RiderDTO,
          CreateDTOClass: RiderInput,
          UpdateDTOClass: RiderInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: RiderWalletEntity,
          DTOClass: RiderWalletDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: RiderTransactionEntity,
          DTOClass: RiderTransactionDTO,
          create: { many: { disabled: true } },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: RiderAddressEntity,
          DTOClass: RiderAddressDTO,
          create: { many: { disabled: true } },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [RiderResolver, SharedRiderService],
})
export class RiderModule {}
