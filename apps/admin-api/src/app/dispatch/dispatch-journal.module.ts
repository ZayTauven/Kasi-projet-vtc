import { Module } from '@nestjs/common';
import { DispatchJournalResolver } from './dispatch-journal.resolver';

/**
 * p2-dispatch D4 et D6 (2026-10-20) : journal du dispatch par vagues
 * (`dispatch_attempt`) et demande non servie (`unserved_demand`), en lecture.
 */
@Module({
  providers: [DispatchJournalResolver],
})
export class DispatchJournalModule {}
