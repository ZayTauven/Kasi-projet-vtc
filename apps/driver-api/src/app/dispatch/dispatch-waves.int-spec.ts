/**
 * p2-dispatch D2-D3 (2026-10-20) : vagues, expiration par course et client
 * prevenu (bug-aucun-kasiman), mode legacy inchange. Contre PostgreSQL et
 * Redis reels ; fiche : docs/fiche-portage-dispatch.md §3 a §5.
 *
 *   npm run test:integration -- dispatch-waves
 */
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  activityCount,
  ALMADIES,
  buildDispatchWaves,
  buildDriverApi,
  buildRiderApi,
  concurrently,
  createOperator,
  createOrder,
  createRegion,
  createWorld,
  CURRENCY,
  Doubles,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  PLATEAU,
  RecordingQueue,
  resetDatabase,
  setServicePricing,
  World,
} from '../../../../../tools/test-integration/harness';
import { TEST_REDIS_DB } from '../../../../../tools/test-integration/env';
import { ShiftRuleEntity } from '../../../../../libs/database/src/lib/entities/shift-rule.entity';
import { RequestActivityType } from '../../../../../libs/database/src/lib/entities/enums/request-activity-type.enum';
import { DriverDeductTransactionType } from '../../../../../libs/database/src/lib/entities/enums/driver-deduct-transaction-type.enum';
import { TransactionAction } from '../../../../../libs/database/src/lib/entities/enums/transaction-action.enum';
import { LedgerAccounts, postManualOperation } from '../../../../../libs/database/src/lib/order/ledger';
import {
  bullRootOptions,
  DISPATCH_QUEUE,
  NO_KASIMAN_PUSH,
  waveRadii,
} from '../../../../../libs/database/src/lib/order/dispatch-config';
import { DispatchProducer } from '../../../../../libs/database/src/lib/order/dispatch-producer.service';
import { OrderResolver as RiderOrderResolver } from '../../../../rider-api/src/app/order/order.resolver';
import { CronJobService } from '../order/cron-job.service';
import { dispatchQueueOptions } from './dispatch-queue';
import { DispatchTickProcessor } from './dispatch-tick.processor';
import { KycCheckService } from '../kyc/kyc-check.service';
import { DispatchWaveService } from './dispatch-wave.service';

const KM_LAT = 0.008993; // 1 km vers le nord, en degres de latitude
const at = (km: number) => ({ lat: PLATEAU.lat + km * KM_LAT, lng: PLATEAU.lng });
const DISPATCH_ENV = [
  'DISPATCH_MODE',
  'DISPATCH_WAVE_INTERVAL_MS',
  'DISPATCH_EXPIRE_AFTER_MS',
  'DISPATCH_WAVE_SIZE',
  'DISPATCH_WAVE_RADII_M',
  'DISPATCH_BOOKING_LEAD_MS',
  'DISPATCH_PREFER_SINGLE_SERVICE',
];

describe('p2-dispatch D2-D3 : vagues et client prevenu', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
    for (const name of DISPATCH_ENV) saved[name] = process.env[name];
  });
  afterAll(async () => {
    for (const name of DISPATCH_ENV) {
      if (saved[name] == null) delete process.env[name];
      else process.env[name] = saved[name];
    }
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });

  async function setUp(drivers: number, searchRadius = 5000) {
    await resetDatabase(ds, redis);
    for (const name of DISPATCH_ENV) delete process.env[name];
    process.env.DISPATCH_MODE = 'waves';
    d = makeDoubles();
    world = await createWorld(ds, { drivers });
    await ds.query(`UPDATE service SET "searchRadius" = $1 WHERE id = $2`, [searchRadius, world.serviceId]);
    for (const driverId of world.driverIds) {
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        driverId,
        world.serviceId,
      ]);
    }
  }

  const k = (i: number) => world.driverIds[i];
  const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

  async function place(positions: Record<number, number>) {
    const shared = buildDriverApi(ds, redis, d, k(0));
    for (const [i, km] of Object.entries(positions)) {
      await shared.driverRedis.setLocation(k(Number(i)), at(km));
    }
  }

  /** Offre ouverte au point PLATEAU, inscrite dans Redis comme le fait createOrder. */
  async function openOffer(minutes = 0): Promise<number> {
    const orderId = await createOrder(ds, world);
    const order = await orderRow(ds, orderId);
    await buildDriverApi(ds, redis, d, k(0)).orderRedis.add({ ...order, fleetIds: [] } as never, minutes);
    return orderId;
  }

  const offers = () =>
    d.pubSub.events
      .filter((e) => e.trigger === 'orderCreated')
      .map((e) => sorted((e.payload as { driverIds: number[] }).driverIds));
  const expiredUpdates = () =>
    d.pubSub.events.filter(
      (e) =>
        e.trigger === 'orderUpdated' &&
        (e.payload as { orderUpdated: { status: OrderStatus } }).orderUpdated.status === OrderStatus.Expired,
    ).length;
  const visibleTo = async (i: number) =>
    (await buildDriverApi(ds, redis, d, k(i)).orderService.getOrdersForDriver(k(i))).map((o) => o.id);

  function cron(waves: DispatchWaveService) {
    const shared = buildDriverApi(ds, redis, d, k(0));
    return new CronJobService(
      shared.orderService,
      { findByIds: async () => [], expireDriverStatus: async () => undefined } as never,
      redis as never,
      shared.driverRedis,
      shared.orderRedis,
      d.driverNotifications as never,
      shared.sharedDriver,
      shared.sharedFleet,
      ds.getRepository(ShiftRuleEntity),
      waves,
    );
  }

  it('rayons : 1, 2, 3 km puis le rayon du service, sans vague en double', () => {
    expect(waveRadii(5000)).toEqual([1000, 2000, 3000, 5000]);
    expect(waveRadii(3000)).toEqual([1000, 2000, 3000]);
    expect(waveRadii(1500)).toEqual([1000, 1500]);
  });

  describe('vagues successives (vraie file BullMQ, durees reduites)', () => {
    let app: INestApplicationContext;
    let producer: DispatchProducer;

    afterEach(async () => {
      await producer?.onModuleDestroy();
      await app?.close();
    });

    it('1 km, 2 km, 3 km, rayon du service, puis « aucun Kasiman » une seule fois', async () => {
      await setUp(4);
      process.env.DISPATCH_WAVE_INTERVAL_MS = '300';
      process.env.DISPATCH_EXPIRE_AFTER_MS = '300';
      await place({ 0: 0.5, 1: 1.5, 2: 2.5, 3: 4 });
      const orderId = await openOffer();

      const moduleRef = await Test.createTestingModule({
        imports: [BullModule.forRoot(bullRootOptions(TEST_REDIS_DB)), BullModule.registerQueue(dispatchQueueOptions)],
        providers: [
          DispatchTickProcessor,
          { provide: CronJobService, useValue: { cronTask: async () => undefined } },
          { provide: KycCheckService, useValue: { run: async () => undefined } },
          {
            provide: DispatchWaveService,
            useFactory: (queue: Queue) => buildDispatchWaves(ds, redis, d, queue).waves,
            inject: [getQueueToken(DISPATCH_QUEUE)],
          },
        ],
      }).compile();
      app = await moduleRef.init();
      producer = new DispatchProducer(bullRootOptions(TEST_REDIS_DB));

      const start = Date.now();
      await producer.dispatchOrder(orderId, 0);
      await producer.dispatchOrder(orderId, 0); // double envoi : deduplique par jobId
      const deadline = Date.now() + 20_000;
      while ((await orderRow(ds, orderId)).status !== OrderStatus.Expired) {
        if (Date.now() > deadline) throw new Error('course jamais expiree');
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 200));

      // Offre cumulative : chaque vague republie aux Kasimen deja sollicites.
      expect(offers()).toEqual([
        [k(0)],
        sorted([k(0), k(1)]),
        sorted([k(0), k(1), k(2)]),
        sorted([k(0), k(1), k(2), k(3)]),
      ]);
      expect(d.driverNotifications.count('requests')).toBe(4); // une push par nouveau Kasiman
      expect(Date.now() - start).toBeGreaterThanOrEqual(3 * 300 + 300);
      expect(d.riderNotifications.count('plainText')).toBe(1);
      expect(d.riderNotifications.args.find((a) => a.method === 'plainText')?.args.slice(1)).toEqual([
        NO_KASIMAN_PUSH.title,
        NO_KASIMAN_PUSH.body,
      ]);
      expect(expiredUpdates()).toBe(1);
      expect(d.pubSub.count('orderRemoved')).toBe(1);
      expect(await activityCount(ds, orderId, RequestActivityType.Expired)).toBe(1);
    });
  });

  describe('vagues pas a pas (file enregistreuse)', () => {
    it('1re vague : 5 Kasimen au plus, mono-service en tete (Q9 revisee) ; availableOrders limite (Q6)', async () => {
      await setUp(7);
      const otherService: number = (
        await ds.query(
          `WITH m AS (INSERT INTO media (address) VALUES ('second.png') RETURNING id)
           INSERT INTO service ("categoryId", title, "mediaId", "cancellationTotalFee", "cancellationDriverShare",
             "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait")
           SELECT "categoryId", 'Second service', (SELECT id FROM m), "cancellationTotalFee", "cancellationDriverShare",
             "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait"
           FROM service WHERE id = $1 RETURNING id`,
          [world.serviceId],
        )
      )[0].id;
      // k0, le plus proche, est polyvalent : classe apres les 6 mono-service de l'anneau.
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        k(0),
        otherService,
      ]);
      await place({ 0: 0.1, 1: 0.2, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.6, 6: 0.7 });
      const orderId = await openOffer();
      const { waves, queue } = buildDispatchWaves(ds, redis, d);
      const jobs = (queue as RecordingQueue).jobs;

      expect(await visibleTo(1)).toEqual([]); // pas encore adressee
      const w1 = await waves.runWave({ orderId, wave: 1 });
      expect(w1.added).toEqual([k(1), k(2), k(3), k(4), k(5)]);
      expect(jobs[0]).toMatchObject({
        name: 'wave',
        data: { orderId, wave: 2 },
        opts: { jobId: `wave-${orderId}-2`, delay: 30_000 },
      });
      expect(await visibleTo(1)).toEqual([orderId]);
      expect(await visibleTo(0)).toEqual([]);
      expect(await visibleTo(6)).toEqual([]);

      const w2 = await waves.runWave({ orderId, wave: 2 });
      expect(w2.added).toEqual([k(6), k(0)]); // mono-service d'abord, puis le polyvalent
      expect(sorted(w2.published)).toEqual(sorted(world.driverIds));
      expect(await visibleTo(0)).toEqual([orderId]);

      // Rejeu du meme job : personne de plus, pas de push, suite replanifiee.
      const pushes = d.driverNotifications.count('requests');
      const replay = await waves.runWave({ orderId, wave: 2 });
      expect(replay.added).toEqual([]);
      expect(d.driverNotifications.count('requests')).toBe(pushes);

      await waves.runWave({ orderId, wave: 3 });
      const last = await waves.runWave({ orderId, wave: 4 });
      expect(last.next).toBe('expire');
      expect(jobs[jobs.length - 1]).toMatchObject({
        name: 'expire',
        data: { orderId },
        opts: { jobId: `expire-${orderId}`, delay: 120_000 },
      });
    });

    it('Q9 revisee : un polyvalent est sollicite des la 1re vague s il reste de la place', async () => {
      await setUp(3);
      const [{ id: mediaId }] = await ds.query(`INSERT INTO media (address) VALUES ('poly.png') RETURNING id`);
      const [{ id: otherService }] = await ds.query(
        `INSERT INTO service ("categoryId", title, "mediaId")
         SELECT "categoryId", 'Autre', $2 FROM service WHERE id = $1 RETURNING id`,
        [world.serviceId, mediaId],
      );
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        k(0),
        otherService,
      ]);
      await place({ 0: 0.1, 1: 0.5, 2: 0.8 });
      const { waves } = buildDispatchWaves(ds, redis, d);
      const w1 = await waves.runWave({ orderId: await openOffer(), wave: 1 });
      expect(w1.added).toEqual([k(1), k(2), k(0)]); // mono-service d'abord, le polyvalent ensuite

      // Reglage coupe : seul l'ordre de distance compte.
      process.env.DISPATCH_PREFER_SINGLE_SERVICE = 'false';
      process.env.DISPATCH_WAVE_SIZE = '2';
      const w1b = await waves.runWave({ orderId: await openOffer(), wave: 1 });
      expect(w1b.added).toEqual([k(0), k(1)]);
    });

    it('Kasiman bloque pour dette exclu de chaque vague, meme sollicite avant', async () => {
      await setUp(3);
      await ds.query(
        `INSERT INTO money_policy (currency, "debtLimit", "debtAlertThreshold") VALUES ($1, 10000, 7500)`,
        [CURRENCY],
      );
      const operatorId = await createOperator(ds, ['DriverWallet_Edit']);
      const debit = (driverId: number) =>
        postManualOperation(ds.manager, {
          account: LedgerAccounts.kasiman(driverId),
          amount: -12000,
          currency: CURRENCY,
          operatorId,
          motif: 'Test : dette',
          walletFields: {
            action: TransactionAction.Deduct,
            deductType: DriverDeductTransactionType.Correction,
          },
        });
      await debit(k(0));
      await place({ 0: 0.2, 1: 0.5, 2: 1.5 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);

      expect((await waves.runWave({ orderId, wave: 1 })).added).toEqual([k(1)]);
      await debit(k(1)); // bloque entre deux vagues
      const w2 = await waves.runWave({ orderId, wave: 2 });
      expect(w2.added).toEqual([k(2)]);
      expect(w2.published).toEqual([k(2)]);
      for (const wave of [3, 4]) {
        expect((await waves.runWave({ orderId, wave })).published).not.toContain(k(0));
      }
      expect(offers().flat()).not.toContain(k(0));
    });

    it('acceptation en vague 2 : plus de vague, pas d expiration, pas de push client', async () => {
      await setUp(2);
      await place({ 0: 0.5, 1: 1.5 });
      const orderId = await openOffer();
      const { waves, queue } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });
      expect((await waves.runWave({ orderId, wave: 2 })).added).toEqual([k(1)]);
      await buildDriverApi(ds, redis, d, k(1)).update(orderId, { status: OrderStatus.DriverAccepted });

      const jobsBefore = (queue as RecordingQueue).jobs.length;
      expect((await waves.runWave({ orderId, wave: 3 })).next).toBe('stop');
      expect((queue as RecordingQueue).jobs.length).toBe(jobsBefore);
      expect(await waves.expire({ orderId })).toBe(false);
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.DriverAccepted);
      expect(offers()).toHaveLength(2);
      expect(d.riderNotifications.count('plainText')).toBe(0);
      expect(expiredUpdates()).toBe(0);
    });

    it('expiration rejouee et filet du cron en meme temps : une seule push client', async () => {
      await setUp(1);
      // Prise en charge il y a 11 min : le cron (REQUEST_EXPIRATION 10 min) la voit aussi.
      const orderId = await openOffer(-11);
      const { waves } = buildDispatchWaves(ds, redis, d);
      const results = await concurrently(3, (i) =>
        i === 2 ? cron(waves).cronTask().then(() => false) : waves.expire({ orderId }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(results.filter((r) => r.status === 'fulfilled' && r.value === true).length).toBeLessThanOrEqual(1);
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.Expired);
      expect(d.riderNotifications.count('plainText')).toBe(1);
      expect(expiredUpdates()).toBe(1);
      expect(await activityCount(ds, orderId, RequestActivityType.Expired)).toBe(1);
      expect(await waves.expire({ orderId })).toBe(false);
      expect(d.riderNotifications.count('plainText')).toBe(1);
    });

    it('expiration contre acceptation simultanee : un seul gagnant', async () => {
      await setUp(1);
      await place({ 0: 0.5 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });
      await concurrently(2, (i) =>
        i === 0
          ? buildDriverApi(ds, redis, d, k(0)).update(orderId, { status: OrderStatus.DriverAccepted }).then(() => true)
          : waves.expire({ orderId }),
      );
      const status = (await orderRow(ds, orderId)).status;
      expect([OrderStatus.DriverAccepted, OrderStatus.Expired]).toContain(status);
      expect(d.riderNotifications.count('plainText')).toBe(status === OrderStatus.Expired ? 1 : 0);
      expect(d.riderNotifications.count('accepted')).toBe(status === OrderStatus.DriverAccepted ? 1 : 0);
    });
  });

  describe('createOrder (rider-api) selon DISPATCH_MODE', () => {
    async function riderCreateOrder(intervalMinutes = 0) {
      if (intervalMinutes === 0) {
        await createRegion(ds, [world.serviceId]);
        await setServicePricing(ds, world.serviceId);
      }
      const api = buildRiderApi(ds, redis, d);
      const resolver = new RiderOrderResolver(
        { req: { user: { id: world.riderId } } } as never,
        api.sharedOrder,
        api.riderOrderService,
        api.driverRedis,
        api.commonCoupon,
      );
      const order = await resolver.createOrder({
        serviceId: world.serviceId,
        points: [PLATEAU, ALMADIES],
        addresses: ['Plateau', 'Almadies'],
        intervalMinutes,
      } as never);
      return Number(order.id);
    }

    it('legacy (defaut) : diffusion unique a tout le rayon, aucune vague, offre visible de tous', async () => {
      await setUp(3, 10000);
      delete process.env.DISPATCH_MODE;
      await place({ 0: 0.5, 1: 2.5, 2: 4 });
      const orderId = await riderCreateOrder();
      expect(offers()).toEqual([sorted(world.driverIds)]);
      expect(d.driverNotifications.count('requests')).toBe(1);
      expect(d.dispatch.dispatched).toEqual([]);
      expect(await visibleTo(2)).toEqual([orderId]);
      // Expiration par le cron en legacy : rien de nouveau cote client.
      await redis.zadd('request-time', Date.now() - 11 * 60_000, String(orderId));
      await cron(buildDispatchWaves(ds, redis, d).waves).cronTask();
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.Expired);
      expect(d.riderNotifications.count('plainText')).toBe(0);
      expect(expiredUpdates()).toBe(0);
    });

    it('waves : pas de diffusion a la creation, 1re vague planifiee ; reservation 15 min avant', async () => {
      await setUp(3, 10000);
      await place({ 0: 0.5, 1: 2.5, 2: 4 });
      const now = await riderCreateOrder();
      expect(offers()).toEqual([]);
      expect(d.driverNotifications.count('requests')).toBe(0);
      expect(d.dispatch.dispatched).toEqual([{ orderId: now, delayMs: 0 }]);
      expect((await orderRow(ds, now)).status).toBe(OrderStatus.Requested);
      expect(await visibleTo(0)).toEqual([]);

      await ds.query(`UPDATE request SET status = 'RiderCanceled' WHERE id = $1`, [now]);
      const booked = await riderCreateOrder(60);
      expect((await orderRow(ds, booked)).status).toBe(OrderStatus.Booked);
      const delay = d.dispatch.dispatched[1].delayMs;
      expect(delay).toBeGreaterThan(44 * 60_000);
      expect(delay).toBeLessThanOrEqual(45 * 60_000);
    });
  });
});
