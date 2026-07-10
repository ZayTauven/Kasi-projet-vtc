import { NestjsQueryGraphQLModule } from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { RiderAddressEntity } from '@kasi/database/rider-address.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddressDTO } from './dto/address.dto';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([RiderAddressEntity])],
      resolvers: [
        {
          EntityClass: RiderAddressEntity,
          DTOClass: AddressDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
})
export class AddressModule {}
