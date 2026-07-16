import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { CallMaskingProviderEntity } from '@kasi/database/call-masking-provider.entity';
import { CallMaskingModule } from '@kasi/order/call-masking.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallMaskingProviderDTO } from './dto/call-masking-provider.dto';
import { CallMaskingProviderInput } from './dto/call-masking-provider.input';
import { CallMaskingProviderResolver } from './call-masking-provider.resolver';

@Module({
  imports: [
    CallMaskingModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([CallMaskingProviderEntity])],
      resolvers: [
        {
          EntityClass: CallMaskingProviderEntity,
          DTOClass: CallMaskingProviderDTO,
          CreateDTOClass: CallMaskingProviderInput,
          UpdateDTOClass: CallMaskingProviderInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [CallMaskingProviderResolver],
})
export class CallMaskingProviderModule {}
