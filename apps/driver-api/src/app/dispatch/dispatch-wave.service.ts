import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DispatchAttemptOutcome } from '@kasi/database/dispatch-attempt.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  dispatchConfig,
  DispatchConfig,
  DISPATCH_ORDER_JOB_OPTIONS,
  DISPATCH_QUEUE,
  DispatchExpireJobData,
  DispatchJob,
  DispatchWaveJobData,
  expireJobId,
  isWavesMode,
  NO_KASIMAN_PUSH,
  waveJobId,
  waveRadii,
} from '@kasi/order/dispatch-config';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
import {
  IRiderNotificationService,
  RIDER_NOTIFICATION_SERVICE,
} from '@kasi/order/interfaces/rider-notification.interface';
import { UNASSIGNED_STATUSES } from '@kasi/order/order-transition';
import { MATRIX_MAX_ORIGINS, RoutingService } from '@kasi/order/routing/routing.service';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { SharedFleetService } from '@kasi/order/shared-fleet.service';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Queue } from 'bullmq';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Redis } from 'ioredis';

import { OrderService } from '../order/order.service';
import { DispatchAttemptJournal, NewDispatchAttempt } from './dispatch-attempt.journal';
import { UnservedDemandService } from './unserved-demand.service';

/** Marqueur de vague deja traitee (rejeu du job), garde une heure. */
const waveDoneKey = (orderId: number, wave: number) => `dispatch-wave-done:${orderId}:${wave}`;
const WAVE_DONE_TTL_S = 3600;
/**
 * D4-D6 : vague en cours d'une course (un refus est remplace dans ce rayon) ;
 * sa presence dit aussi que la course a ete dispatchee par vagues (demande
 * non servie, D6). Gardee 6 heures.
 */
const currentWaveKey = (orderId: number) => `dispatch-wave-current:${orderId}`;
const CURRENT_WAVE_TTL_S = 6 * 3600;

/** Candidat classe d'une vague (D5). */
interface RankedCandidate {
  driver: DriverEntity;
  airDistanceM: number;
  roadDistanceM: number | null;
  roadDurationS: number | null;
  routingSource: string | null;
  /** Q9 : n'a que le service commande (classe avant les polyvalents). */
  preferred: boolean;
}

type CloseCandidate = { distanceM: number; point: { lat: number; lng: number }; rank: number };

export interface WaveResult {
  /** Kasimen ajoutes par cette vague (push envoyee). */
  added: number[];
  /** Tous les Kasimen a qui l'offre a ete (re)publiee par `orderCreated`. */
  published: number[];
  /** Suite planifiee : vague suivante, expiration, ou rien (course prise, annulee...). */
  next: 'wave' | 'expire' | 'stop';
}

/**
 * p2-dispatch D2-D3 (2026-10-20) : dispatch par vagues, porte du dispatcher
 * BetterSuite 5.3.2 (`dispatch-broadcast` et `expire-order`), adapte a Kasi
 * (docs/fiche-portage-dispatch.md §2 a §5) :
 *
 * - vagues a rayon croissant (1, 2, 3 km puis le rayon du service, Q2),
 *   30 s d'intervalle, 5 nouveaux Kasimen au plus par vague, les plus proches
 *   (Q3) ; offre cumulative (Q5) : chaque vague republie `orderCreated` aux
 *   Kasimen deja sollicites et encore eligibles (bug-offre-perdue), la push
 *   ne part qu'aux nouveaux ;
 * - candidats filtres a chaque vague par `getOnlineDriversWithServiceId` :
 *   en ligne, service, flotte, livraison, dette (I3), en un seul endroit ;
 * - dans chaque anneau, les Kasimen dont le seul service active est celui
 *   commande passent devant les polyvalents (Q9 revisee en D7 : priorite de
 *   classement, plus une exclusion de la 1re vague) ;
 * - « aucun Kasiman » 2 min apres la derniere vague (Q4) : transition
 *   conditionnelle vers `Expired` (statut deja gere par la rider-app
 *   installee : retour a l'accueil), `orderUpdated` au client, `orderRemoved`
 *   aux Kasimen, push texte unique (Q11) ;
 * - une course qui n'est plus a prendre (acceptee, annulee, expiree) arrete
 *   les vagues.
 *
 * D4-D6 (2026-10-20) :
 * - chaque sollicitation est journalisee (`dispatch_attempt`, une ligne par
 *   course et Kasiman) et c'est l'insertion dans le journal qui decide de la
 *   push : deux vagues ou deux refus concurrents ne sollicitent pas deux fois ;
 * - refus explicite (`rejectOrder`, Q13) : le Kasiman ne revoit plus l'offre,
 *   le suivant de l'anneau est sollicite ; si plus personne n'est en attente,
 *   la vague suivante (ou l'expiration) est avancee ;
 * - classement par la route (Q7) : quand l'anneau compte plus de candidats que
 *   de places, les 10 plus proches a vol d'oiseau sont classes par duree
 *   routiere (matrice Mapbox, repli OSRM puis vol d'oiseau), la priorite
 *   du mode commande (Q9) passant avant la duree ;
 * - « aucun Kasiman » : offres ouvertes closes `expired`, demande non servie
 *   inscrite (Q12, `UnservedDemandService`).
 */
@Injectable()
export class DispatchWaveService {
  private readonly logger = new Logger(DispatchWaveService.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly driverRedisService: DriverRedisService,
    private readonly orderRedisService: OrderRedisService,
    private readonly sharedDriverService: SharedDriverService,
    private readonly sharedFleetService: SharedFleetService,
    @InjectRedis() private readonly redis: Redis,
    @InjectPubSub() private readonly pubSub: RedisPubSub,
    @Inject(DRIVER_NOTIFICATION_SERVICE)
    private readonly driverNotificationService: IDriverNotificationService,
    @Inject(RIDER_NOTIFICATION_SERVICE)
    private readonly riderNotificationService: IRiderNotificationService,
    @InjectQueue(DISPATCH_QUEUE) private readonly queue: Queue,
    private readonly routingService: RoutingService,
    private readonly journal: DispatchAttemptJournal,
    private readonly unservedDemand: UnservedDemandService,
  ) {}

  /** Job `wave` : une vague pour la course, puis planifie la suite. */
  async runWave({ orderId, wave }: DispatchWaveJobData): Promise<WaveResult> {
    const config = dispatchConfig();
    const order = await this.orderService.orderRepository.findOne({
      where: { id: orderId },
      relations: { service: true, options: true },
    });
    if (order == null || !UNASSIGNED_STATUSES.includes(order.status)) {
      this.logger.log(`Course ${orderId}, vague ${wave} : plus a prendre (${order?.status ?? 'absente'}), arret.`);
      // Prise, annulee ou expiree : les offres restees ouvertes sont closes.
      await this.closeAttempts(orderId, DispatchAttemptOutcome.NoAnswer);
      return { added: [], published: [], next: 'stop' };
    }
    const radii = waveRadii(order.service?.searchRadius, config);
    const radius = radii[Math.min(wave, radii.length) - 1];
    const isLast = wave >= radii.length;

    let added: number[] = [];
    let published: number[] = [];
    // Rejeu du meme job (reprise BullMQ, double planification) : ni nouveau
    // Kasiman ni push, mais la suite est replanifiee (dedupliquee par jobId).
    const firstRun =
      (await this.redis.set(waveDoneKey(orderId, wave), '1', 'EX', WAVE_DONE_TTL_S, 'NX')) === 'OK';
    if (firstRun) {
      await this.redis.set(currentWaveKey(orderId), String(wave), 'EX', CURRENT_WAVE_TTL_S);
      ({ added, published } = await this.offer(order, wave, radius, config, config.waveSize));
    }

    if (!isLast) {
      await this.schedule(
        DispatchJob.Wave,
        { orderId, wave: wave + 1 },
        waveJobId(orderId, wave + 1),
        config.waveIntervalMs,
      );
    } else {
      await this.schedule(DispatchJob.Expire, { orderId }, expireJobId(orderId), config.expireAfterMs);
    }
    this.logger.log(
      `Course ${orderId}, vague ${wave}/${radii.length} (${radius} m) : +${added.length} Kasiman(s), ` +
        `offre a ${published.length}${firstRun ? '' : ' (rejeu)'}.`,
    );
    return { added, published, next: isLast ? 'expire' : 'wave' };
  }

  /** Job `expire` : « aucun Kasiman ». Sans effet si la course a ete prise entre-temps. */
  async expire({ orderId }: DispatchExpireJobData): Promise<boolean> {
    const expired = await this.orderService.expireOrders([orderId]);
    await this.notifyExpired(expired);
    if (!expired.includes(orderId)) {
      // Prise ou annulee entre-temps : ce qui reste ouvert n'a pas eu de reponse.
      await this.closeAttempts(orderId, DispatchAttemptOutcome.NoAnswer);
    }
    return expired.includes(orderId);
  }

  /**
   * D4 (Q13) : refus explicite d'une offre par le Kasiman (mutation
   * facultative `rejectOrder`). Vrai si le refus est enregistre (ou l'etait
   * deja : rejeu). Faux sans offre ouverte pour lui, ou en mode `legacy`
   * (aucun effet : rien ne change dans ce mode). Le suivant de l'anneau est
   * sollicite ; si plus personne n'est en attente, la suite est avancee.
   */
  async reject(orderId: number, driverId: number): Promise<boolean> {
    if (!isWavesMode()) return false;
    const { result, wave } = await this.journal.respond(orderId, driverId, DispatchAttemptOutcome.Rejected);
    if (result === 'none') return false;
    if (result === 'same') return true; // rejeu : ni Kasiman ni push de plus
    await this.orderRedisService.driverRejected(orderId, driverId);

    const config = dispatchConfig();
    const order = await this.orderService.orderRepository.findOne({
      where: { id: orderId },
      relations: { service: true, options: true },
    });
    if (order == null || !UNASSIGNED_STATUSES.includes(order.status)) return true;
    const radii = waveRadii(order.service?.searchRadius, config);
    const current = Number(await this.redis.get(currentWaveKey(orderId))) || wave || 1;
    const radius = radii[Math.min(current, radii.length) - 1];
    const { added } = await this.offer(order, current, radius, config, 1);
    this.logger.log(
      `Course ${orderId} : refus du Kasiman ${driverId} (vague ${current}), ` +
        (added.length > 0 ? `remplace par ${added[0]}.` : 'aucun remplacant dans le rayon.'),
    );
    if (added.length === 0 && (await this.journal.pendingCount(orderId)) === 0) {
      await this.promote(current < radii.length ? waveJobId(orderId, current + 1) : expireJobId(orderId));
    }
    return true;
  }

  /**
   * Client et Kasimen prevenus d'une expiration reellement ecrite. La
   * transition conditionnelle ne renvoie une course qu'une fois : une seule
   * push, meme si l'expiration par course et le cron passent ensemble.
   */
  async notifyExpired(orderIds: number[]): Promise<void> {
    for (const orderId of orderIds) {
      try {
        const order = await this.orderService.orderRepository.findOne({
          where: { id: orderId },
          relations: { service: true, rider: true, options: true },
        });
        if (order == null) continue;
        await this.recordUnserved(order);
        this.pubSub.publish('orderUpdated', { orderUpdated: order });
        this.pubSub.publish('orderRemoved', { orderRemoved: order });
        if (order.rider != null) {
          await this.riderNotificationService.plainText(
            order.rider,
            NO_KASIMAN_PUSH.title,
            NO_KASIMAN_PUSH.body,
          );
        }
        this.logger.log(`Course ${orderId} : aucun Kasiman, client prevenu.`);
      } catch (error) {
        this.logger.warn(`Course ${orderId} : client non prevenu (${(error as Error).message}).`);
      }
    }
  }

  private async offer(
    order: RequestEntity,
    wave: number,
    radius: number,
    config: DispatchConfig,
    limit: number,
  ): Promise<{ added: number[]; published: number[] }> {
    const pickup = order.points[0];
    const close = await this.driverRedisService.getCloseByDistance(pickup, radius);
    const byId = new Map<number, CloseCandidate>(close.map((x, i) => [x.driverId, { ...x, rank: i }]));
    const already = await this.orderRedisService.getDriversNotified(order.id);
    const rejected = await this.orderRedisService.getDriversRejected(order.id);
    const fleetIds = await this.sharedFleetService.getFleetIdsInPoint(pickup);
    const eligibility = { service: order.service, packageSize: order.packageSize };

    const fresh = await this.sharedDriverService.getOnlineDriversWithServiceId(
      close.map((x) => x.driverId).filter((id) => !already.includes(id)),
      order.serviceId,
      fleetIds,
      eligibility,
      order.currency,
    );
    // Q9 revisee : le mode commande est une priorite dans l'anneau, puis la
    // distance. Sans le reglage, seul l'ordre GEO compte.
    const preferred = new Set(
      config.preferSingleService
        ? fresh.filter((driver) => (driver.enabledServices ?? []).length === 1).map((x) => x.id)
        : [],
    );
    fresh.sort(
      (a, b) =>
        Number(preferred.has(b.id)) - Number(preferred.has(a.id)) ||
        (byId.get(a.id)?.rank ?? 0) - (byId.get(b.id)?.rank ?? 0),
    );
    const chosen = (await this.rank(fresh, byId, pickup, limit, preferred)).slice(0, limit);

    // D4 : le journal decide. Seuls les Kasimen reellement inscrits (pas deja
    // sollicites pour cette course) recoivent l'offre et la push.
    const offset = chosen.length > 0 ? await this.journal.rankCount(order.id, wave) : 0;
    const rows: NewDispatchAttempt[] = chosen.map((c, i) => ({
      requestId: order.id,
      driverId: c.driver.id,
      wave,
      rank: offset + i + 1,
      airDistanceM: Math.round(c.airDistanceM),
      roadDistanceM: c.roadDistanceM,
      roadDurationS: c.roadDurationS,
      routingSource: c.routingSource,
    }));
    const inserted = new Set(await this.journal.record(rows));
    const newcomers: DriverEntity[] = chosen.map((c) => c.driver).filter((x) => inserted.has(x.id));

    // Offre cumulative : les Kasimen des vagues precedentes encore eligibles
    // (en ligne, pas bloques pour dette entre-temps, sans refus) la revoient.
    const previous = already.filter((id) => !rejected.includes(id));
    const still =
      previous.length > 0
        ? await this.sharedDriverService.getOnlineDriversWithServiceId(
            previous,
            order.serviceId,
            fleetIds,
            eligibility,
            order.currency,
          )
        : [];

    if (newcomers.length > 0) {
      await this.orderRedisService.driverNotified(order.id, newcomers);
    }
    const published = [...still.map((x) => x.id), ...newcomers.map((x) => x.id)];
    if (published.length > 0) {
      this.pubSub.publish('orderCreated', { orderCreated: order, driverIds: published });
    }
    if (newcomers.length > 0) {
      this.driverNotificationService.requests(newcomers);
    }
    return { added: newcomers.map((x) => x.id), published };
  }

  /**
   * D5 (Q7) : classement de l'anneau. Si les candidats tiennent dans la vague,
   * l'ordre ne change pas qui est sollicite : aucun appel (quota). Sinon les
   * 10 plus proches a vol d'oiseau sont classes par duree routiere (matrice
   * Mapbox, repli OSRM puis vol d'oiseau) ; un trajet sans itineraire passe
   * apres les autres ; a egalite, le plus proche a vol d'oiseau. La priorite
   * du mode commande (Q9) passe avant la duree : `candidates` arrive deja
   * trie par priorite puis distance.
   */
  private async rank(
    candidates: DriverEntity[],
    byId: Map<number, CloseCandidate>,
    pickup: { lat: number; lng: number },
    limit: number,
    preferred: Set<number>,
  ): Promise<RankedCandidate[]> {
    const plain = (driver: DriverEntity): RankedCandidate => ({
      driver,
      airDistanceM: byId.get(driver.id)?.distanceM ?? 0,
      roadDistanceM: null,
      roadDurationS: null,
      routingSource: null,
      preferred: preferred.has(driver.id),
    });
    if (candidates.length <= limit) return candidates.map(plain);
    const pool = candidates.slice(0, MATRIX_MAX_ORIGINS);
    const matrix = await this.routingService.getDurationsTo(
      pool.map((driver) => byId.get(driver.id)?.point ?? pickup),
      pickup,
    );
    const ranked = pool.map((driver, i) => ({
      ...plain(driver),
      roadDistanceM: matrix.legs[i]?.distance ?? null,
      roadDurationS: matrix.legs[i]?.duration ?? null,
      routingSource: matrix.source,
    }));
    ranked.sort((a, b) => {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      const da = a.roadDurationS ?? Number.POSITIVE_INFINITY;
      const db = b.roadDurationS ?? Number.POSITIVE_INFINITY;
      return da !== db ? da - db : a.airDistanceM - b.airDistanceM;
    });
    return ranked;
  }

  /** D4 : journal clos sans faire echouer le dispatch. */
  private async closeAttempts(
    orderId: number,
    outcome: DispatchAttemptOutcome.Expired | DispatchAttemptOutcome.NoAnswer,
  ): Promise<void> {
    try {
      await this.journal.close(orderId, outcome);
    } catch (error) {
      this.logger.warn(`Course ${orderId} : journal non clos (${(error as Error).message}).`);
    }
  }

  /**
   * D4 et D6 : course reellement expiree. Offres ouvertes closes `expired` ;
   * si elle a ete dispatchee par vagues, demande non servie inscrite (et
   * alerte eventuelle). Une course en attente de prepaiement expiree n'en est
   * pas une (aucune vague).
   */
  private async recordUnserved(order: RequestEntity): Promise<void> {
    try {
      await this.journal.close(order.id, DispatchAttemptOutcome.Expired);
      if ((await this.redis.exists(currentWaveKey(order.id))) === 0) return;
      await this.unservedDemand.record(order, await this.journal.solicitedCount(order.id));
    } catch (error) {
      this.logger.warn(`Course ${order.id} : demande non servie non inscrite (${(error as Error).message}).`);
    }
  }

  /** Avance un job differe (vague suivante ou expiration). */
  private async promote(jobId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job != null && (await job.isDelayed())) {
        await job.promote();
        this.logger.log(`Job ${jobId} avance : plus personne en attente.`);
      }
    } catch (error) {
      this.logger.warn(`Job ${jobId} non avance : ${(error as Error).message}`);
    }
  }

  private async schedule(
    name: DispatchJob,
    data: DispatchWaveJobData | DispatchExpireJobData,
    jobId: string,
    delay: number,
  ): Promise<void> {
    await this.queue.add(name, data, { ...DISPATCH_ORDER_JOB_OPTIONS, jobId, delay });
  }
}
