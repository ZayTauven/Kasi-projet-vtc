import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { describeIntegrity, ledgerIntegrityReport } from '@kasi/order/ledger-integrity';
import { DataSource } from 'typeorm';

/**
 * p2-argent I2 (2026-10-19) : balayage d'integrite quotidien du grand livre
 * (fiche §3.9). Lecture seule : journalise un resume, et chaque ecart en
 * erreur (relaye par GlitchTip quand p1-sentry sera branche). Ne corrige
 * jamais rien : un ecart se corrige par une ecriture motivee.
 *
 * `@Interval` de 24 h, comme la purge de retention (ScheduleModule.forRoot()
 * enregistre par RetentionPolicyModule, seul forRoot d'admin-api).
 */
@Injectable()
export class LedgerIntegrityJob {
  private readonly logger = new Logger('LedgerIntegrity');

  constructor(private dataSource: DataSource) {}

  @Interval('ledger-integrity-sweep', 24 * 60 * 60 * 1000)
  async sweep(): Promise<void> {
    try {
      const report = await ledgerIntegrityReport(this.dataSource.manager);
      if (report.ok) {
        this.logger.log(describeIntegrity(report));
        return;
      }
      this.logger.error(describeIntegrity(report));
      for (const issue of report.issues) {
        this.logger.error(`[${issue.kind}] ${issue.detail}`);
      }
    } catch (error) {
      this.logger.error(`balayage impossible : ${(error as Error).message}`);
    }
  }
}
