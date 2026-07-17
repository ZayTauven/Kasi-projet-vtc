import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionPolicyEntity } from '@kasi/database/retention-policy.entity';
import { MediaEntity } from '@kasi/database/media.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RetentionPolicyDTO } from './dto/retention-policy.dto';
import { RetentionPolicyInput } from './dto/retention-policy.input';
import { RetentionPolicyAuthorizer } from './dto/retention-policy.authorizer';
import { RetentionPolicyResolver } from './retention-policy.resolver';
import { RetentionPolicyService } from './retention-policy.service';

@Module({
  imports: [
    // admin-api n'a PAS de ScheduleModule.forRoot() global (seul driver-api en
    // possède un). On l'enregistre donc ici pour activer le @Interval du job de
    // purge. Pas de doublon : c'est le seul forRoot() du process admin-api.
    ScheduleModule.forRoot(),
    // OperatorEntity nécessaire à RetentionPolicyAuthorizer (lecture du rôle).
    NestjsQueryTypeOrmModule.forFeature([MediaEntity, OperatorEntity]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([RetentionPolicyEntity]),
      ],
      resolvers: [
        {
          EntityClass: RetentionPolicyEntity,
          DTOClass: RetentionPolicyDTO,
          CreateDTOClass: RetentionPolicyInput,
          UpdateDTOClass: RetentionPolicyInput,
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
  providers: [
    RetentionPolicyResolver,
    RetentionPolicyService,
    RetentionPolicyAuthorizer,
  ],
})
export class RetentionPolicyModule {}
