import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { purgeFareQuotes } from '@kasi/order/fare-quote.service';
import { DataSource } from 'typeorm';

/**
 * p2-argent I4 (2026-10-20) : purge quotidienne des devis (fiche argent
 * §5.2) : devis non consommes de plus de 24 heures. Les devis consommes
 * restent (lies a leur course par `requestId`).
 *
 * `@Interval` de 24 h, comme le balayage du grand livre (ScheduleModule
 * enregistre par RetentionPolicyModule).
 */
@Injectable()
export class FareQuotePurgeJob {
  private readonly logger = new Logger('FareQuotePurge');

  constructor(private dataSource: DataSource) {}

  @Interval('fare-quote-purge', 24 * 60 * 60 * 1000)
  async purge(): Promise<number> {
    try {
      const removed = await purgeFareQuotes(this.dataSource.manager);
      this.logger.log(`${removed} devis perime(s) supprime(s)`);
      return removed;
    } catch (error) {
      this.logger.error(`purge impossible : ${(error as Error).message}`);
      return 0;
    }
  }
}
