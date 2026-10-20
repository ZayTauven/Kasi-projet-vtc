import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';

import {
  bullRootOptions,
  DISPATCH_ORDER_JOB_OPTIONS,
  DISPATCH_QUEUE,
  DispatchJob,
  DispatchWaveJobData,
  waveJobId,
} from './dispatch-config';

/** Connexion BullMQ du producteur (le banc la remplace par la base Redis 15). */
export const DISPATCH_PRODUCER_OPTIONS = 'DISPATCH_PRODUCER_OPTIONS';

/**
 * p2-dispatch D2 (2026-10-20) : producteur leger du dispatch par vagues (Q1).
 *
 * Utilise par SharedOrderService (createOrder, processPrePay) dans rider-api
 * et admin-api ; le consommateur est driver-api. La file n'est ouverte qu'au
 * premier envoi : en `DISPATCH_MODE=legacy`, aucune connexion BullMQ.
 */
@Injectable()
export class DispatchProducer implements OnModuleDestroy {
  private queue: Queue | null = null;

  constructor(
    @Optional()
    @Inject(DISPATCH_PRODUCER_OPTIONS)
    private readonly options?: Pick<QueueOptions, 'connection' | 'prefix'>,
  ) {}

  private getQueue(): Queue {
    if (this.queue == null) {
      this.queue = new Queue(DISPATCH_QUEUE, this.options ?? bullRootOptions());
    }
    return this.queue;
  }

  /**
   * Premiere vague de la course, tout de suite ou differee (reservation).
   * Dedupliquee par `jobId` : un second appel pour la meme course est sans effet.
   */
  async dispatchOrder(orderId: number, delayMs = 0): Promise<void> {
    const data: DispatchWaveJobData = { orderId, wave: 1 };
    await this.getQueue().add(DispatchJob.Wave, data, {
      ...DISPATCH_ORDER_JOB_OPTIONS,
      jobId: waveJobId(orderId, 1),
      delay: Math.max(0, Math.round(delayMs)),
    });
    Logger.log(
      `Course ${orderId} : 1re vague planifiee (dans ${Math.round(delayMs / 1000)} s).`,
      DispatchProducer.name,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    this.queue = null;
  }
}
