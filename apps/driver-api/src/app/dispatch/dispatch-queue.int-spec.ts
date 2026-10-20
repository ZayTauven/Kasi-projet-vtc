/**
 * p2-dispatch D1 (2026-10-20) : BullMQ dans driver-api et relance du cron
 * (bs-act-bullmq, bug-offre-perdue), contre PostgreSQL et Redis reels.
 * Fiche : docs/fiche-portage-dispatch.md, section 6, D1.
 *
 *   npm run test:integration -- dispatch-queue
 */
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildDriverApi,
  createOrder,
  createWorld,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  PLATEAU,
  resetDatabase,
  World,
} from '../../../../../tools/test-integration/harness';
import { TEST_REDIS_DB } from '../../../../../tools/test-integration/env';
import { ShiftRuleEntity } from '../../../../../libs/database/src/lib/entities/shift-rule.entity';
import { CronJobService } from '../order/cron-job.service';
import {
  bullRootOptions,
  DISPATCH_QUEUE,
  DISPATCH_TICK_EVERY_MS,
  DISPATCH_TICK_SCHEDULER,
  dispatchQueueOptions,
  DispatchJob,
  KASI_BULL_PREFIX,
} from './dispatch-queue';
import { DispatchTickProcessor } from './dispatch-tick.processor';
import { KYC_CHECK_PATTERN, KYC_CHECK_SCHEDULER, KycCheckService } from '../kyc/kyc-check.service';
import { DispatchWaveService } from './dispatch-wave.service';

const MINUTE = 60_000;

describe('p2-dispatch D1 : BullMQ et relance des offres', () => {
  let ds: DataSource;
  let redis: Redis;
  let world: World;

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
  });
  afterAll(async () => {
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });
  beforeEach(async () => {
    await resetDatabase(ds, redis);
    world = await createWorld(ds, { drivers: 2 });
    for (const driverId of world.driverIds) {
      await ds.query(
        `INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`,
        [driverId, world.serviceId],
      );
    }
  });

  const api = () => buildDriverApi(ds, redis, makeDoubles(), world.driverIds[0]);
  const sortedDriverIds = () => [...world.driverIds].sort((a, b) => a - b);

  async function placeDrivers() {
    const shared = api();
    for (const driverId of world.driverIds) {
      await shared.driverRedis.setLocation(driverId, { lat: PLATEAU.lat + 0.001, lng: PLATEAU.lng });
    }
  }

  /** Offre inscrite dans Redis comme le fait createOrder (prise en charge dans `minutes`). */
  async function openOffer(status = OrderStatus.Requested, minutes = 0): Promise<number> {
    const orderId = await createOrder(ds, world, { status });
    const order = await orderRow(ds, orderId);
    await api().orderRedis.add({ ...order, fleetIds: [] } as never, minutes);
    return orderId;
  }

  function cronWithRecorder() {
    const shared = api();
    const sent: number[][] = [];
    const cron = new CronJobService(
      shared.orderService,
      { findByIds: async () => [], expireDriverStatus: async () => undefined } as never,
      redis as never,
      shared.driverRedis,
      shared.orderRedis,
      {
        requests: async (drivers: Array<{ id: number }>) => {
          sent.push(drivers.map((x) => x.id).sort((a, b) => a - b));
        },
      } as never,
      shared.sharedDriver,
      shared.sharedFleet,
      ds.getRepository(ShiftRuleEntity),
    );
    return { cron, sent, shared };
  }

  describe('OrderRedisService : lecture par heure de prise en charge', () => {
    it('getRequestIdsInTimeRage lit par score (ms), getAll renvoie tout', async () => {
      const now = await openOffer(OrderStatus.Requested, 0);
      const soon = await openOffer(OrderStatus.Booked, 20);
      const later = await openOffer(OrderStatus.Booked, 60);
      const orderRedis = api().orderRedis;
      const ts = Date.now();
      const inWindow = await orderRedis.getRequestIdsInTimeRage(ts - 10 * MINUTE, ts + 30 * MINUTE);
      expect(inWindow.map(Number).sort((a, b) => a - b)).toEqual([now, soon]);
      expect((await orderRedis.getAll()).map(Number).sort((a, b) => a - b)).toEqual([now, soon, later]);
    });
  });

  describe('relance du cron (bug-offre-perdue)', () => {
    it('relance une course en attente, une seule fois par Kasiman', async () => {
      await placeDrivers();
      const orderId = await openOffer();
      const { cron, sent, shared } = cronWithRecorder();
      await cron.cronTask();
      expect(sent).toEqual([sortedDriverIds()]);
      const notified = await shared.orderRedis.getDriversNotified(orderId);
      expect(notified.sort((a, b) => a - b)).toEqual(sortedDriverIds());
      await cron.cronTask();
      expect(sent).toHaveLength(1);
    });

    it('ne relance pas les Kasimen deja prevenus a la creation', async () => {
      await placeDrivers();
      const orderId = await openOffer();
      const { cron, sent, shared } = cronWithRecorder();
      await shared.orderRedis.driverNotified(orderId, [{ id: world.driverIds[0] }] as never);
      await cron.cronTask();
      expect(sent).toEqual([[world.driverIds[1]]]);
    });

    it('ignore prepaiement en attente et course acceptee, survit a une offre sans position', async () => {
      await placeDrivers();
      await openOffer(OrderStatus.WaitingForPrePay);
      await openOffer(OrderStatus.DriverAccepted);
      // Offre presente dans request-time mais plus dans l index geographique.
      const orphan = await openOffer();
      await redis.zrem('request', String(orphan));
      const waiting = await openOffer();
      const { cron, sent, shared } = cronWithRecorder();
      await cron.cronTask();
      expect(sent).toEqual([sortedDriverIds()]);
      expect(await shared.orderRedis.getDriversNotified(waiting)).toHaveLength(2);
    });
  });

  describe('file BullMQ kasi-dispatch (bs-act-bullmq)', () => {
    let app: INestApplicationContext;
    let ticks = 0;
    let kycRuns = 0;

    beforeEach(async () => {
      ticks = 0;
      kycRuns = 0;
      const moduleRef = await Test.createTestingModule({
        imports: [
          BullModule.forRoot(bullRootOptions(TEST_REDIS_DB)),
          BullModule.registerQueue(dispatchQueueOptions),
        ],
        providers: [
          DispatchTickProcessor,
          // D2-D3 : le consommateur porte aussi les vagues (non sollicitees ici).
          { provide: DispatchWaveService, useValue: {} },
          // p2-kyc K1 : controle des documents, meme consommateur.
          {
            provide: KycCheckService,
            useValue: {
              run: async () => {
                kycRuns++;
              },
            },
          },
          {
            provide: CronJobService,
            useValue: {
              cronTask: async () => {
                ticks++;
              },
            },
          },
        ],
      }).compile();
      // Contexte sans serveur HTTP : seuls les hooks de cycle de vie comptent.
      app = await moduleRef.init();
    });
    afterEach(async () => {
      await app.close();
    });

    async function waitFor(predicate: () => boolean, timeoutMs = 10_000) {
      const start = Date.now();
      while (!predicate()) {
        if (Date.now() - start > timeoutMs) throw new Error('delai depasse');
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    it('planifie le battement du cron et le fait executer par le consommateur', async () => {
      const queue = app.get<Queue>(getQueueToken(DISPATCH_QUEUE));
      const schedulers = await queue.getJobSchedulers();
      expect(schedulers).toHaveLength(2);
      const tick = schedulers.find((x) => x.key === DISPATCH_TICK_SCHEDULER);
      expect(Number(tick?.every)).toBe(DISPATCH_TICK_EVERY_MS);
      expect(tick?.name).toBe(DispatchJob.Tick);
      // p2-kyc K1 : controle des documents, chaque heure.
      const kyc = schedulers.find((x) => x.key === KYC_CHECK_SCHEDULER);
      expect(kyc).toMatchObject({ name: DispatchJob.KycCheck, pattern: KYC_CHECK_PATTERN });
      // Le premier battement d un planificateur every part tout de suite.
      await waitFor(() => ticks >= 1);
      expect(ticks).toBe(1);
    });

    it('redemarrer ne cree pas de second planificateur', async () => {
      await app.get(DispatchTickProcessor).onApplicationBootstrap();
      const queue = app.get<Queue>(getQueueToken(DISPATCH_QUEUE));
      expect(await queue.getJobSchedulers()).toHaveLength(2);
    });

    it('p2-kyc K1 : un job kyc-check est confie au controle des documents', async () => {
      const queue = app.get<Queue>(getQueueToken(DISPATCH_QUEUE));
      await queue.add(DispatchJob.KycCheck, {});
      await waitFor(() => kycRuns >= 1);
      expect(kycRuns).toBe(1);
    });

    it('cles Redis sous le prefixe kasi-bull, jamais sous bull', async () => {
      await waitFor(() => ticks >= 1);
      const ours = await redis.keys(`${KASI_BULL_PREFIX}:${DISPATCH_QUEUE}:*`);
      expect(ours.length).toBeGreaterThan(0);
      expect(await redis.keys('bull:*')).toEqual([]);
    });
  });
});
