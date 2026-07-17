import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { ShiftRuleEntity } from '@kasi/database/shift-rule.entity';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { ShiftRuleDTO } from './dto/shift-rule.dto';

// P6.3 — lecture seule des Shift Rules pour le driver-app. Query `shiftRules`
// (+ `shiftRule(id)`) protégée par le JWT driver. Aucune mutation.
@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([ShiftRuleEntity])],
      resolvers: [
        {
          EntityClass: ShiftRuleEntity,
          DTOClass: ShiftRuleDTO,
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          guards: [GqlAuthGuard],
        },
      ],
    }),
  ],
})
export class ShiftRuleModule {}
