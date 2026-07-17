import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { ShiftRuleEntity } from '@kasi/database/shift-rule.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShiftRuleDTO } from './dto/shift-rule.dto';
import { ShiftRuleInput } from './dto/shift-rule.input';
import { ShiftRuleResolver } from './shift-rule.resolver';
import { ShiftRuleService } from './shift-rule.service';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([ShiftRuleEntity])],
      resolvers: [
        {
          EntityClass: ShiftRuleEntity,
          DTOClass: ShiftRuleDTO,
          CreateDTOClass: ShiftRuleInput,
          UpdateDTOClass: ShiftRuleInput,
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
  providers: [ShiftRuleResolver, ShiftRuleService],
})
export class ShiftRuleModule {}
