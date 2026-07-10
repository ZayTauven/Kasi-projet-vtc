import { NestjsQueryGraphQLModule } from '@ptc-org/nestjs-query-graphql';
import { Module } from '@nestjs/common';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { RiderEntity } from '@kasi/database/rider-entity';
import { RiderDTO } from './dto/rider.dto';
import { UpdateRiderInput } from './dto/update-rider.input';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { RiderWalletEntity } from '@kasi/database/rider-wallet.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { RiderTransactionEntity } from '@kasi/database/rider-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiderEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
    ]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([RiderEntity])],
      resolvers: [
        {
          EntityClass: RiderEntity,
          DTOClass: RiderDTO,
          UpdateDTOClass: UpdateRiderInput,
          read: { many: { disabled: true } },
          create: { disabled: true },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          guards: [GqlAuthGuard],
        },
      ],
    }),
  ],
  providers: [SharedRiderService],
  exports: [SharedRiderService],
})
export class RiderModule {}
