import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { FleetTransactionEntity } from '@kasi/database/fleet-transaction.entity';
import { FleetWalletEntity } from '@kasi/database/fleet-wallet.entity';
import { FleetEntity } from '@kasi/database/fleet.entity';
import { SharedFleetService } from '@kasi/order/shared-fleet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FleetTransactionDTO } from './dto/fleet-transaction.dto';
import { FleetWalletDTO } from './dto/fleet-wallet.dto';
import { FleetDTO } from './dto/fleet.dto';
import { FleetResolver } from './fleet.resolver';
import { FleetInput } from './dto/fleet.input';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          FleetEntity,
          FleetTransactionEntity,
          FleetWalletEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: FleetEntity,
          DTOClass: FleetDTO,
          CreateDTOClass: FleetInput,
          UpdateDTOClass: FleetInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: FleetWalletEntity,
          DTOClass: FleetWalletDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: FleetTransactionEntity,
          DTOClass: FleetTransactionDTO,
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
  providers: [FleetResolver, SharedFleetService],
})
export class FleetModule {}
