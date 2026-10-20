/**
 * p2-dispatch (2026-10-20) : file BullMQ `kasi-dispatch` et reglages du
 * dispatch par vagues (docs/fiche-portage-dispatch.md, §3, §5 D2-D3 et §7).
 *
 * Partage par les producteurs (rider-api et admin-api, via SharedOrderService)
 * et par le consommateur (driver-api, DispatchTickProcessor). Les reglages sont
 * lus a chaque appel (Q10 : variables d'environnement au pilote, table de
 * reglage apres le pilote), ce qui permet au banc de reduire les durees.
 */
import { QueueOptions } from 'bullmq';

export const KASI_BULL_PREFIX = 'kasi-bull';
export const DISPATCH_QUEUE = 'kasi-dispatch';

export enum DispatchJob {
  /** Battement du cron (D1) : expirations, relance legacy, regles de service. */
  Tick = 'tick',
  /** D2 : une vague d'offres pour une course (`{ orderId, wave }`). */
  Wave = 'wave',
  /** D3 : « aucun Kasiman », apres la derniere vague (`{ orderId }`). */
  Expire = 'expire',
  /** p2-kyc K1 : controle des documents (expiration, suspension, rappels). */
  KycCheck = 'kyc-check',
}

export interface DispatchWaveJobData {
  orderId: number;
  wave: number;
}

export interface DispatchExpireJobData {
  orderId: number;
}

/** Identifiants dedupliques (BullMQ refuse « : » dans un identifiant libre). */
export const waveJobId = (orderId: number, wave: number) => `wave-${orderId}-${wave}`;
export const expireJobId = (orderId: number) => `expire-${orderId}`;

/**
 * Base logique Redis de la file BullMQ (`kasi-dispatch`, prefixe `kasi-bull`).
 * Attention : ce n'est PAS celle des donnees des API. `RedisModule.forRoot`
 * ignore `commonOptions: { db: 2 }` avec une config unique (il ne l'applique
 * qu'a un tableau de clients) : positions GEO, cles de vague
 * (`request-drivers:*`, `dispatch-wave-*`), pub/sub et le reste sont en base 0
 * (constate en D7, 2026-10-20). La file reste en base 2, isolee.
 */
export const KASI_REDIS_DB = 2;

/** Connexion BullMQ, lue dans le meme environnement que RedisModule.forRoot. */
export function bullRootOptions(db = KASI_REDIS_DB): Pick<QueueOptions, 'connection' | 'prefix'> {
  return {
    prefix: KASI_BULL_PREFIX,
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db,
    },
  };
}

/** Options des jobs de course : quelques reprises, pas d'accumulation. */
export const DISPATCH_ORDER_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'fixed', delay: 2_000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 500 },
};

export type DispatchMode = 'legacy' | 'waves';

export interface DispatchConfig {
  mode: DispatchMode;
  /** Q2 : rayons des vagues en metres, avant la derniere au rayon du service. */
  radiiM: number[];
  /** Q3 : delai entre deux vagues. */
  waveIntervalMs: number;
  /** Q3 : Kasimen au plus par vague (nouveaux candidats). */
  waveSize: number;
  /** Q4 : « aucun Kasiman » apres la derniere vague. */
  expireAfterMs: number;
  /** Q4 : une reservation est dispatchee ce delai avant l'heure prevue. */
  bookingLeadMs: number;
  /**
   * Q9 revisee (D7) : dans chaque anneau, les Kasimen n'ayant que le service
   * commande passent devant les polyvalents (priorite, plus une exclusion).
   */
  preferSingleService: boolean;
  /** D6 (Q12) : demandes non servies qui declenchent l'alerte... */
  unservedThreshold: number;
  /** ... a moins de ce rayon (metres) ... */
  unservedRadiusM: number;
  /** ... dans cette fenetre. */
  unservedWindowMs: number;
  /** Kasimen en ligne prevenus a moins de ce rayon (metres). */
  unservedAlertRadiusM: number;
  /** Une alerte au plus par zone (rayon `unservedRadiusM`) pendant ce delai. */
  unservedAlertCooldownMs: number;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Reglages courants. `DISPATCH_MODE=legacy` par defaut (Q10). */
export function dispatchConfig(): DispatchConfig {
  const radii = (process.env.DISPATCH_WAVE_RADII_M ?? '1000,2000,3000')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x > 0);
  return {
    mode: process.env.DISPATCH_MODE?.trim().toLowerCase() === 'waves' ? 'waves' : 'legacy',
    radiiM: radii.length > 0 ? radii : [1000, 2000, 3000],
    waveIntervalMs: intEnv('DISPATCH_WAVE_INTERVAL_MS', 30_000),
    waveSize: Math.max(1, intEnv('DISPATCH_WAVE_SIZE', 5)),
    expireAfterMs: intEnv('DISPATCH_EXPIRE_AFTER_MS', 120_000),
    bookingLeadMs: intEnv('DISPATCH_BOOKING_LEAD_MS', 15 * 60_000),
    preferSingleService: process.env.DISPATCH_PREFER_SINGLE_SERVICE !== 'false',
    unservedThreshold: Math.max(1, intEnv('DISPATCH_UNSERVED_THRESHOLD', 3)),
    unservedRadiusM: intEnv('DISPATCH_UNSERVED_RADIUS_M', 1000),
    unservedWindowMs: intEnv('DISPATCH_UNSERVED_WINDOW_MS', 15 * 60_000),
    unservedAlertRadiusM: intEnv('DISPATCH_UNSERVED_ALERT_RADIUS_M', 5000),
    unservedAlertCooldownMs: intEnv('DISPATCH_UNSERVED_ALERT_COOLDOWN_MS', 60 * 60_000),
  };
}

export function isWavesMode(): boolean {
  return dispatchConfig().mode === 'waves';
}

/**
 * Rayons des vagues d'une course : 1, 2, 3 km puis le rayon de recherche du
 * service (Q2). Les rayons au-dela du rayon du service sont ramenes a lui ; un
 * rayon deja couvert n'ouvre pas de vague vide.
 */
export function waveRadii(searchRadiusM: number | null | undefined, config = dispatchConfig()): number[] {
  const max = Number(searchRadiusM) > 0 ? Number(searchRadiusM) : null;
  const radii: number[] = [];
  for (const radius of [...config.radiiM].sort((a, b) => a - b)) {
    const capped = max != null ? Math.min(radius, max) : radius;
    if (radii.length === 0 || capped > radii[radii.length - 1]) radii.push(capped);
  }
  if (max != null && max > radii[radii.length - 1]) radii.push(max);
  return radii;
}

/** Delai avant la 1re vague : tout de suite, ou `bookingLeadMs` avant l'heure. */
export function firstWaveDelayMs(pickupAt: Date | number | null | undefined, now = Date.now()): number {
  if (pickupAt == null) return 0;
  const at = typeof pickupAt === 'number' ? pickupAt : new Date(pickupAt).getTime();
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, at - dispatchConfig().bookingLeadMs - now);
}

/** Texte de la push client quand personne n'a pris la course (Q11). */
export const NO_KASIMAN_PUSH = {
  title: 'Aucun Kasiman disponible',
  body: "Aucun Kasiman n'est disponible près de vous pour le moment. Réessayez dans quelques minutes.",
};

/** D6 (Q12) : push aux Kasimen en ligne proches d'une zone de demande non servie. */
export const UNSERVED_DEMAND_PUSH = {
  title: 'Forte demande près de vous',
  body: "Plusieurs clients n'ont pas trouvé de Kasiman près de vous ces dernières minutes. Restez en ligne pour recevoir leurs courses.",
};
