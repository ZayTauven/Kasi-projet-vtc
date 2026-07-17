import { Authorize, FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ShiftRuleFrequency } from '@kasi/database/enums/shift-rule-frequency.enum';
import { ShiftRuleAuthorizer } from './shift-rule.authorizer';

@ObjectType('ShiftRule')
@Authorize(ShiftRuleAuthorizer)
export class ShiftRuleDTO {
  @IDField(() => ID)
  id!: number;
  name!: string;
  @FilterableField()
  enabled!: boolean;
  @FilterableField(() => ShiftRuleFrequency)
  frequency!: ShiftRuleFrequency;
  @Field(() => Int)
  maxHoursPerPeriod!: number;
  @Field(() => Int)
  mandatoryBreakMinutes!: number;
  @FilterableField()
  enforced!: boolean;
  createdAt!: Date;
}
