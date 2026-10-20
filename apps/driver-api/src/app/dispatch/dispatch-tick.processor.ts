import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DispatchExpireJobData, DispatchWaveJobData } from '@kasi/order/dispatch-config';
import { Job, Queue } from 'bullmq';

import { CronJobService } from '../order/cron-job.service';
import { KYC_CHECK_PATTERN, KYC_CHECK_SCHEDULER, KycCheckService } from '../kyc/kyc-check.service';
import {
  DISPATCH_QUEUE,
  DISPATCH_TICK_EVERY_MS,
  DISPATCH_TICK_SCHEDULER,
  DispatchJob,
} from './dispatch-queue';
import { DispatchWaveService } from './dispatch-wave.service';

/**
 * Consommateur unique de la file `kasi-dispatch` (un seul @Processor par file).
 *
 * - D1 (2026-10-20) : battement du cron (`tick`), traitement inchange
 *   (`CronJobService.cronTask`). Le planificateur BullMQ est idempotent :
 *   chaque demarrage le met a jour sans en creer un second.
 * - D2-D3 (2026-10-20) : vagues (`wave`) et « aucun Kasiman » (`expire`),
 *   produits par rider-api et admin-api en `DISPATCH_MODE=waves`. Plusieurs
 *   jobs en parallele : une vague n'attend pas la fin d'un battement du cron.
 * - p2-kyc K1 (2026-10-20) : controle des documents (`kyc-check`), chaque
 *   heure a la 5e minute (UTC = Dakar), planificateur idempotent lui aussi.
 */
@Processor(DISPATCH_QUEUE, { concurrency: 5 })
export class DispatchTickProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(DispatchTickProcessor.name);

  constructor(
    @InjectQueue(DISPATCH_QUEUE) private readonly queue: Queue,
    private readonly cronJobService: CronJobService,
    private readonly dispatchWaveService: DispatchWaveService,
    private readonly kycCheckService: KycCheckService,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      DISPATCH_TICK_SCHEDULER,
      { every: DISPATCH_TICK_EVERY_MS },
      { name: DispatchJob.Tick },
    );
    this.logger.log(
      `Planificateur ${DISPATCH_TICK_SCHEDULER} actif (toutes les ${DISPATCH_TICK_EVERY_MS / 1000} s).`,
    );
    await this.queue.upsertJobScheduler(
      KYC_CHECK_SCHEDULER,
      { pattern: KYC_CHECK_PATTERN, tz: 'UTC' },
      { name: DispatchJob.KycCheck },
    );
    this.logger.log(`Planificateur ${KYC_CHECK_SCHEDULER} actif (${KYC_CHECK_PATTERN}, UTC).`);
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case DispatchJob.Tick:
        await this.cronJobService.cronTask();
        return;
      case DispatchJob.Wave:
        await this.dispatchWaveService.runWave(job.data as DispatchWaveJobData);
        return;
      case DispatchJob.Expire:
        await this.dispatchWaveService.expire(job.data as DispatchExpireJobData);
        return;
      case DispatchJob.KycCheck:
        await this.kycCheckService.run();
        return;
      default:
        this.logger.warn(`Job inconnu ignore : ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(`Job ${job?.name ?? '?'} (${job?.id ?? '?'}) en echec : ${error?.message}`);
  }
}
