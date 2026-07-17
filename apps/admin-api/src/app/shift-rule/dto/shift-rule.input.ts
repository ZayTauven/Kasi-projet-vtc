import { Field, InputType, Int } from '@nestjs/graphql';
import { ShiftRuleFrequency } from '@kasi/database/enums/shift-rule-frequency.enum';

// Sert de Create ET Update DTO (comme SmsProviderInput / EmailProviderInput)
// pour que le type GraphQL s'appelle exactement ShiftRuleInput, contrat
// attendu du panel.
@InputType()
export class ShiftRuleInput {
  name!: string;
  enabled?: boolean;
  frequency!: ShiftRuleFrequency;
  @Field(() => Int)
  maxHoursPerPeriod!: number;
  @Field(() => Int, { nullable: true })
  mandatoryBreakMinutes?: number;
  enforced?: boolean;
}
