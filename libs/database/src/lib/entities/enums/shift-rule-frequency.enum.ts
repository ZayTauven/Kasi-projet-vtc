import { registerEnumType } from '@nestjs/graphql';

// Période de plafonnement des heures de conduite (chantier P6.3 Shift Rules).
// Les valeurs sérialisées sont contractuelles : le panel construit ses clés
// i18n à partir d'elles.
export enum ShiftRuleFrequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
}

registerEnumType(ShiftRuleFrequency, { name: 'ShiftRuleFrequency' });
