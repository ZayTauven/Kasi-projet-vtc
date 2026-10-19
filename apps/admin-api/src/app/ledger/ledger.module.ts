import { Module } from '@nestjs/common';
import { LedgerIntegrityJob } from './ledger-integrity.job';
import { LedgerResolver } from './ledger.resolver';

/**
 * p2-argent I2 (2026-10-19) : grand livre cote admin-api : requete
 * `ledgerIntegrityReport` et balayage quotidien. Le journal et le rapport
 * dans le panel suivront (kasi-admin-panel).
 */
@Module({
  providers: [LedgerResolver, LedgerIntegrityJob],
})
export class LedgerModule {}
