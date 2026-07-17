import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, Int, ObjectType } from '@nestjs/graphql';
import { ShiftRuleFrequency } from '@kasi/database/enums/shift-rule-frequency.enum';

// Exposition lecture seule des règles de temps de service (P6.3) aux Kasimen.
// L'enum ShiftRuleFrequency est déjà enregistré (registerEnumType) dans le
// fichier de l'enum : ne pas le refaire ici.
@ObjectType('ShiftRule')
export class ShiftRuleDTO {
  @IDField(() => ID)
  id!: number;

  name!: string;

  @FilterableField()
  enabled!: boolean;

  @FilterableField(() => ShiftRuleFrequency)
  frequency!: ShiftRuleFrequency;

  @FilterableField(() => Int)
  maxHoursPerPeriod!: number;

  @FilterableField(() => Int)
  mandatoryBreakMinutes!: number;

  enforced!: boolean;
}
