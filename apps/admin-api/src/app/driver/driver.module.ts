import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { RedisHelpersModule } from '@kasi/redis/redis-helper.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverResolver } from './driver.resolver';
import { DriverService } from './driver.service';
import { DriverTransactionDTO } from './dto/driver-transaction.dto';
import { DriverWalletDTO } from './dto/driver-wallet.dto';
import { DriverDTO } from './dto/driver.dto';
import { UpdateDriverInput } from './dto/driver.input';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { DriverTransactionInput } from './dto/driver-transaction.input';

@Module({
  imports: [
    RedisHelpersModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          DriverEntity,
          DriverTransactionEntity,
          DriverWalletEntity,
          OperatorEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: DriverEntity,
          DTOClass: DriverDTO,
          UpdateDTOClass: UpdateDriverInput,
          CreateDTOClass: UpdateDriverInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          enableAggregate: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: DriverWalletEntity,
          DTOClass: DriverWalletDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: DriverTransactionEntity,
          DTOClass: DriverTransactionDTO,
          CreateDTOClass: DriverTransactionInput,
          create: { many: { disabled: true } },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [DriverResolver, DriverService, SharedDriverService],
})
export class DriverModule {}
