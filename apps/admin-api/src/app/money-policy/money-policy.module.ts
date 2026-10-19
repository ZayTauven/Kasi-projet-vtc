import { Module } from '@nestjs/common';
import { MoneyPolicyResolver } from './money-policy.resolver';

/**
 * p2-argent I3 (2026-10-19) : lecture et reglage de `money_policy` (plafond
 * de dette et seuil d'alerte des Kasimen) depuis le panel.
 */
@Module({
  providers: [MoneyPolicyResolver],
})
export class MoneyPolicyModule {}
