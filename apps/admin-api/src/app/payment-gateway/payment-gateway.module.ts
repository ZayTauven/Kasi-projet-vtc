import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { PaymentGatewayEntity } from '@kasi/database/payment-gateway.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentGatewayDTO } from './dto/payment-gateway.dto';
import { PaymentGatewayInput } from './dto/payment-gateway.input';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([PaymentGatewayEntity])],
      resolvers: [
        {
          EntityClass: PaymentGatewayEntity,
          DTOClass: PaymentGatewayDTO,
          CreateDTOClass: PaymentGatewayInput,
          UpdateDTOClass: PaymentGatewayInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
})
export class PaymentGatewayModule {}
