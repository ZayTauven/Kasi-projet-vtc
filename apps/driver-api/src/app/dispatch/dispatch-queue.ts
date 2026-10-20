/**
 * p2-dispatch D1 / bs-act-bullmq (2026-10-20) : file d'attente BullMQ de
 * driver-api, sur le Redis existant (docs/fiche-portage-dispatch.md §6).
 *
 * - Meme instance que `RedisModule.forRoot`, base logique 2 (les donnees des
 *   API, positions et cles de vague comprises, sont en base 0 : voir
 *   `KASI_REDIS_DB`), cles isolees par le prefixe `kasi-bull`.
 * - Une seule file, `kasi-dispatch` : battement du cron (`tick`, toutes les
 *   5 min, ex-`@Interval(300_000)`), et depuis D2-D3 les vagues (`wave`) et
 *   l'expiration par course (`expire`), produites par rider-api et admin-api.
 *   Constantes partagees : `libs/database/src/lib/order/dispatch-config.ts`.
 */
export {
  bullRootOptions,
  DISPATCH_QUEUE,
  DispatchJob,
  KASI_BULL_PREFIX,
  KASI_REDIS_DB,
} from '@kasi/order/dispatch-config';
import { DISPATCH_QUEUE } from '@kasi/order/dispatch-config';

export const DISPATCH_TICK_SCHEDULER = 'dispatch-tick';
export const DISPATCH_TICK_EVERY_MS = 300_000;

/** Options de la file : pas d'accumulation de jobs termines dans Redis. */
export const dispatchQueueOptions = {
  name: DISPATCH_QUEUE,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
};
