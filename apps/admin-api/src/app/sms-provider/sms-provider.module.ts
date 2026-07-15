import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SmsProviderEntity } from '@kasi/database/sms-provider.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmsProviderDTO } from './dto/sms-provider.dto';
import { SmsProviderInput } from './dto/sms-provider.input';
import { SmsProviderResolver } from './sms-provider.resolver';
import { SmsProviderService } from './sms-provider.service';
import { SmsService } from './sms.service';

@Module({
  imports: [
    HttpModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([SmsProviderEntity])],
      resolvers: [
        {
          EntityClass: SmsProviderEntity,
          DTOClass: SmsProviderDTO,
          CreateDTOClass: SmsProviderInput,
          UpdateDTOClass: SmsProviderInput,
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
  providers: [SmsProviderResolver, SmsProviderService, SmsService],
})
export class SmsProviderModule {}
