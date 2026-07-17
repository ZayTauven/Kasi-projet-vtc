import {
  Authorize,
  FilterableField,
  IDField,
} from '@ptc-org/nestjs-query-graphql';
import { ID, Int, ObjectType } from '@nestjs/graphql';
import { RetentionPolicyAuthorizer } from './retention-policy.authorizer';

@ObjectType('RetentionPolicy')
@Authorize(RetentionPolicyAuthorizer)
export class RetentionPolicyDTO {
  @IDField(() => ID)
  id!: number;
  name!: string;
  @FilterableField()
  enabled!: boolean;
  @FilterableField(() => Int)
  retentionDays!: number;
  // SÉCURITÉ : true = le job ne fait que logger (aucune suppression).
  @FilterableField()
  dryRun!: boolean;
  lastRunAt?: Date;
  createdAt!: Date;
}
