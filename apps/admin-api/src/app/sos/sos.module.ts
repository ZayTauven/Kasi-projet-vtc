import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { RedisPubSubProvider } from '@kasi/database';
import { SOSActivityEntity } from '@kasi/database/sos-activity.entity';
import { SOSEntity } from '@kasi/database/sos.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSOSAcitivtyInput } from './dto/create-sos-activity.input';
import { SOSActivityDTO } from './dto/sos-activity.dto';
import { SOSDTO } from './dto/sos.dto';
import { SOSActivityQueryService } from './sos-acitivty-query.service';
import { SOSSubscriptionService } from './sos-subscription.service';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([SOSEntity, SOSActivityEntity]),
      ],
      services: [SOSActivityQueryService],
      resolvers: [
        {
          EntityClass: SOSEntity,
          DTOClass: SOSDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          enableAggregate: true,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: SOSActivityEntity,
          DTOClass: SOSActivityDTO,
          CreateDTOClass: CreateSOSAcitivtyInput,
          ServiceClass: SOSActivityQueryService,
          read: { disabled: true },
          create: { many: { disabled: true } },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.NONE,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [SOSSubscriptionService, RedisPubSubProvider.provider()],
})
export class SOSModule {}
