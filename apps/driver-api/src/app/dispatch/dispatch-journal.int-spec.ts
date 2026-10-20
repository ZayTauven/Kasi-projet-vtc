/**
 * p2-dispatch D4-D6 (2026-10-20) : journal `dispatch_attempt` et refus
 * explicite (D4), classement par la route (D5), demande non servie (D6).
 * Contre PostgreSQL et Redis reels ; fiche : docs/fiche-portage-dispatch.md §6.
 *
 *   npm run test:integration -- dispatch-journal
 */
import Redis from 'ioredis';
import { Observable, of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';

import {
  buildDispatchWaves,
  buildDriverApi,
  concurrently,
  createOperator,
  createOrder,
  createWorld,
  Doubles,
  errorOf,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  PLATEAU,
  RecordingQueue,
  resetDatabase,
  World,
} from '../../../../../tools/test-integration/harness';
import { MapTileProvider } from '../../../../../libs/database/src/lib/entities/enums/map-tile-provider.enum';
import { UNSERVED_DEMAND_PUSH, waveJobId } from '../../../../../libs/database/src/lib/order/dispatch-config';
import { RoutingService } from '../../../../../libs/database/src/lib/order/routing/routing.service';
import { DispatchAttemptOutcome } from '../../../../../libs/database/src/lib/entities/dispatch-attempt.entity';
import { DispatchJournalResolver } from '../../../../admin-api/src/app/dispatch/dispatch-journal.resolver';

const KM_LAT = 0.008993; // 1 km vers le nord, en degres de latitude
const at = (km: number) => ({ lat: PLATEAU.lat + km * KM_LAT, lng: PLATEAU.lng });
const DISPATCH_ENV = [
  'DISPATCH_MODE',
  'DISPATCH_WAVE_SIZE',
  'DISPATCH_WAVE_RADII_M',
  'DISPATCH_PREFER_SINGLE_SERVICE',
  'DISPATCH_UNSERVED_THRESHOLD',
  'DISPATCH_UNSERVED_RADIUS_M',
  'DISPATCH_UNSERVED_WINDOW_MS',
  'DISPATCH_UNSERVED_ALERT_RADIUS_M',
  'DISPATCH_UNSERVED_ALERT_COOLDOWN_MS',
];

interface AttemptRow {
  driverId: number;
  wave: number;
  rank: number;
  airDistanceM: number;
  roadDurationS: number | null;
  routingSource: string | null;
  outcome: DispatchAttemptOutcome;
  respondedAt: Date | null;
}

/** Faux HttpService : matrice Mapbox et table OSRM, en service ou en panne. */
class FakeHttp {
  mapbox: 'up' | 'down' = 'up';
  osrm: 'up' | 'down' = 'down';
  /** Duree (s) par Kasiman, dans l'ordre des origines envoyees. */
  durations: (origins: number) => number[] = (n) => Array.from({ length: n }, (_, i) => 100 * (i + 1));
  readonly calls: Array<{ url: string; params: Record<string, string> }> = [];

  get(url: string, config: { params: Record<string, string> }): Observable<unknown> {
    this.calls.push({ url, params: config.params });
    const isMapbox = url.includes('api.mapbox.com/directions-matrix');
    if ((isMapbox && this.mapbox === 'down') || (!isMapbox && this.osrm === 'down')) {
      return throwError(() => new Error(isMapbox ? 'Mapbox 503' : 'OSRM injoignable'));
    }
    const n = config.params.sources.split(';').length;
    const durations = this.durations(n).map((x) => [x + (isMapbox ? 0 : 1)]);
    return of({ data: { code: 'Ok', durations, distances: durations.map(([x]) => [x * 8]) } });
  }
}

describe('p2-dispatch D4-D6 : journal, refus, classement par la route, demande non servie', () => {
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

  async function setUp(drivers: number) {
    await resetDatabase(ds, redis);
    for (const name of DISPATCH_ENV) delete process.env[name];
    process.env.DISPATCH_MODE = 'waves';
    d = makeDoubles();
    world = await createWorld(ds, { drivers });
    await ds.query(`UPDATE service SET "searchRadius" = 5000 WHERE id = $1`, [world.serviceId]);
    for (const driverId of world.driverIds) {
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        driverId,
        world.serviceId,
      ]);
    }
  }

  const k = (i: number) => world.driverIds[i];

  async function place(positions: Record<number, number>) {
    const shared = buildDriverApi(ds, redis, d, k(0));
    for (const [i, km] of Object.entries(positions)) {
      await shared.driverRedis.setLocation(k(Number(i)), at(km));
    }
  }

  async function openOffer(): Promise<number> {
    const orderId = await createOrder(ds, world);
    const order = await orderRow(ds, orderId);
    await buildDriverApi(ds, redis, d, k(0)).orderRedis.add({ ...order, fleetIds: [] } as never, 0);
    return orderId;
  }

  const attempts = async (orderId: number): Promise<AttemptRow[]> =>
    ds.query(
      `SELECT "driverId", "wave", "rank", "airDistanceM", "roadDurationS", "routingSource", "outcome", "respondedAt"
         FROM dispatch_attempt WHERE "requestId" = $1 ORDER BY "wave", "rank"`,
      [orderId],
    );
  const outcomes = async (orderId: number) =>
    Object.fromEntries((await attempts(orderId)).map((a) => [a.driverId, a.outcome]));
  const pushedTo = () =>
    d.driverNotifications.args
      .filter((a) => a.method === 'requests')
      .map((a) => (a.args[0] as Array<{ id: number }>).map((x) => x.id));
  const visibleTo = async (i: number) =>
    (await buildDriverApi(ds, redis, d, k(i)).orderService.getOrdersForDriver(k(i))).map((o) => o.id);

  describe('D4 : journal et refus', () => {
    it('une ligne par Kasiman sollicite ; acceptation : accepted, les autres no_answer', async () => {
      await setUp(3);
      await place({ 0: 0.3, 1: 0.5, 2: 0.7 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });

      const rows = await attempts(orderId);
      expect(rows.map((r) => [r.driverId, r.wave, r.rank, r.outcome])).toEqual([
        [k(0), 1, 1, 'pending'],
        [k(1), 1, 2, 'pending'],
        [k(2), 1, 3, 'pending'],
      ]);
      expect(rows.map((r) => Math.round(r.airDistanceM / 100))).toEqual([3, 5, 7]);
      // Pas plus de candidats que de places : aucun appel de matrice (quota).
      expect(rows.every((r) => r.routingSource == null)).toBe(true);
      expect(d.routing.matrixCalls).toHaveLength(0);

      // Rejeu de la vague jusqu'a l'insertion : aucune ligne ni push de plus.
      await redis.del(`dispatch-wave-done:${orderId}:1`);
      await waves.runWave({ orderId, wave: 1 });
      expect(await attempts(orderId)).toHaveLength(3);
      expect(pushedTo()).toEqual([[k(0), k(1), k(2)]]);

      await buildDriverApi(ds, redis, d, k(1)).update(orderId, { status: OrderStatus.DriverAccepted });
      expect(await outcomes(orderId)).toEqual({
        [k(0)]: 'no_answer',
        [k(1)]: 'accepted',
        [k(2)]: 'no_answer',
      });
      expect((await attempts(orderId)).every((r) => r.respondedAt != null)).toBe(true);
    });

    it('refus : rejected, rejouable ; sans offre ou en legacy : faux et sans effet', async () => {
      await setUp(3);
      await place({ 0: 0.3, 1: 0.5, 2: 4 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });

      expect(await waves.reject(orderId, k(2))).toBe(false); // pas sollicite (4 km)
      expect(await waves.reject(orderId, k(0))).toBe(true);
      const pushes = d.driverNotifications.count('requests');
      expect(await waves.reject(orderId, k(0))).toBe(true); // rejeu
      expect(d.driverNotifications.count('requests')).toBe(pushes);
      expect(await outcomes(orderId)).toEqual({ [k(0)]: 'rejected', [k(1)]: 'pending' });

      process.env.DISPATCH_MODE = 'legacy';
      expect(await waves.reject(orderId, k(1))).toBe(false);
      expect((await outcomes(orderId))[k(1)]).toBe('pending');
    });

    it('« aucun Kasiman » : offres ouvertes expired, demande non servie inscrite', async () => {
      await setUp(2);
      await place({ 0: 0.3, 1: 0.6 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });
      await waves.reject(orderId, k(1));
      expect(await waves.expire({ orderId })).toBe(true);
      expect(await waves.expire({ orderId })).toBe(false); // rejeu

      expect(await outcomes(orderId)).toEqual({ [k(0)]: 'expired', [k(1)]: 'rejected' });
      const demands = await ds.query(`SELECT "requestId", "driversSolicited", "alertedAt" FROM unserved_demand`);
      expect(demands).toEqual([{ requestId: orderId, driversSolicited: 2, alertedAt: null }]);

      // Lecture admin-api : permission Requests_View exigee.
      const resolver = async (permissions: string[]) =>
        new DispatchJournalResolver(ds, { req: { user: { id: await createOperator(ds, permissions) } } } as never);
      const denied = await resolver(['Drivers_View']);
      expect(await errorOf(denied.dispatchAttempts(orderId))).toBe('PERMISSION_NOT_GRANTED');
      expect(await errorOf(denied.unservedDemands())).toBe('PERMISSION_NOT_GRANTED');
      const allowed = await resolver(['Requests_View']);
      expect((await allowed.dispatchAttempts(orderId)).map((a) => [a.driverId, a.driverName, a.outcome])).toEqual([
        [k(0), 'Kasiman 1', 'expired'],
        [k(1), 'Kasiman 2', 'rejected'],
      ]);
      const [demand] = await allowed.unservedDemands();
      expect(demand).toMatchObject({ requestId: orderId, driversSolicited: 2, lat: PLATEAU.lat, lng: PLATEAU.lng });
    });

    it('course annulee entre deux vagues : offres ouvertes no_answer, pas de demande non servie', async () => {
      await setUp(1);
      await place({ 0: 0.3 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });
      await ds.query(`UPDATE request SET status = 'RiderCanceled' WHERE id = $1`, [orderId]);
      expect((await waves.runWave({ orderId, wave: 2 })).next).toBe('stop');
      expect(await outcomes(orderId)).toEqual({ [k(0)]: 'no_answer' });
      expect(await ds.query(`SELECT 1 FROM unserved_demand`)).toHaveLength(0);
    });

    it('le refus fait passer au suivant ; tous refusent : la vague suivante est avancee', async () => {
      await setUp(4);
      process.env.DISPATCH_WAVE_SIZE = '2';
      await place({ 0: 0.2, 1: 0.4, 2: 0.6, 3: 1.5 });
      const orderId = await openOffer();
      const queue = new RecordingQueue();
      const { waves } = buildDispatchWaves(ds, redis, d, queue);
      expect((await waves.runWave({ orderId, wave: 1 })).added).toEqual([k(0), k(1)]);

      expect(await waves.reject(orderId, k(0))).toBe(true);
      expect(pushedTo()).toEqual([[k(0), k(1)], [k(2)]]); // le suivant de l'anneau (1 km)
      expect(await visibleTo(0)).not.toContain(orderId);
      expect(await visibleTo(1)).toContain(orderId);
      expect(await visibleTo(2)).toContain(orderId);
      const lastOffer = d.pubSub.events.filter((e) => e.trigger === 'orderCreated').pop();
      expect([...(lastOffer?.payload as { driverIds: number[] }).driverIds].sort()).toEqual([k(1), k(2)].sort());
      expect(queue.promoted).toEqual([]);

      await waves.reject(orderId, k(1));
      expect(queue.promoted).toEqual([]); // k(2) attend encore
      await waves.reject(orderId, k(2));
      expect(queue.promoted).toEqual([waveJobId(orderId, 2)]); // plus personne a 1 km

      // Vague 2 : k(3) sollicite ; les Kasimen qui ont refuse ne revoient pas l'offre.
      const w2 = await waves.runWave({ orderId, wave: 2 });
      expect(w2.added).toEqual([k(3)]);
      expect(w2.published).toEqual([k(3)]);
      expect(await outcomes(orderId)).toEqual({
        [k(0)]: 'rejected',
        [k(1)]: 'rejected',
        [k(2)]: 'rejected',
        [k(3)]: 'pending',
      });
      expect((await attempts(orderId)).map((r) => [r.wave, r.rank])).toEqual([
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 1],
      ]);
    });

    it('deux refus simultanes : jamais deux sollicitations du meme Kasiman', async () => {
      await setUp(4);
      process.env.DISPATCH_WAVE_SIZE = '2';
      await place({ 0: 0.2, 1: 0.4, 2: 0.6, 3: 0.8 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await waves.runWave({ orderId, wave: 1 });
      await concurrently(2, async (i) => waves.reject(orderId, k(i)));
      const added = pushedTo().slice(1).flat();
      expect(added.length).toBeGreaterThanOrEqual(1);
      expect(new Set(added).size).toBe(added.length);
      expect(await attempts(orderId)).toHaveLength(2 + added.length);
    });
  });

  describe('D5 : classement par la route (matrice)', () => {
    function realRouting(http: FakeHttp, provider = MapTileProvider.Mapbox) {
      return new RoutingService(
        http as never,
        { findOne: async () => ({ provider, mapboxToken: 'pk.test-jeton' }) } as never,
        {} as never,
      );
    }

    it('Mapbox : le plus rapide par la route passe devant le plus proche a vol d oiseau', async () => {
      await setUp(3);
      process.env.DISPATCH_WAVE_SIZE = '1';
      await place({ 0: 0.2, 1: 0.5, 2: 0.8 });
      const orderId = await openOffer();
      const http = new FakeHttp();
      http.durations = () => [300, 200, 60]; // k(2) : 60 s par la route
      const { waves } = buildDispatchWaves(ds, redis, d, new RecordingQueue(), realRouting(http));

      expect((await waves.runWave({ orderId, wave: 1 })).added).toEqual([k(2)]);
      expect(http.calls).toHaveLength(1);
      expect(http.calls[0].url).toContain('api.mapbox.com/directions-matrix/v1/mapbox/driving/');
      expect(http.calls[0].params).toMatchObject({
        access_token: 'pk.test-jeton',
        sources: '0;1;2',
        destinations: '3',
      });
      const [row] = await attempts(orderId);
      expect(row).toMatchObject({ driverId: k(2), rank: 1, roadDurationS: 60, routingSource: 'mapbox' });
    });

    it('Mapbox en panne : repli OSRM, puis vol d oiseau si OSRM tombe aussi', async () => {
      await setUp(3);
      process.env.DISPATCH_WAVE_SIZE = '1';
      await place({ 0: 0.2, 1: 0.5, 2: 0.8 });
      const http = new FakeHttp();
      http.mapbox = 'down';
      http.osrm = 'up';
      http.durations = () => [300, 50, 200];
      const routing = realRouting(http);

      const first = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d, new RecordingQueue(), routing);
      expect((await waves.runWave({ orderId: first, wave: 1 })).added).toEqual([k(1)]);
      expect((await attempts(first))[0]).toMatchObject({ routingSource: 'osrm', roadDurationS: 51 });
      expect(http.calls.map((c) => c.url.includes('router.project-osrm.org/table'))).toEqual([false, true]);

      http.osrm = 'down';
      const second = await openOffer();
      expect((await waves.runWave({ orderId: second, wave: 1 })).added).toEqual([k(0)]); // le plus proche
      expect((await attempts(second))[0]).toMatchObject({ routingSource: 'haversine' });
    });

    it('au plus 10 candidats par appel ; le mode commande passe avant la duree (Q9 revisee)', async () => {
      await setUp(13);
      const positions: Record<number, number> = {};
      for (let i = 0; i < 13; i++) positions[i] = 0.05 + i * 0.07;
      await place(positions);
      // k(0) est polyvalent : classe apres les 12 mono-service malgre la meilleure place.
      const [{ id: mediaId }] = await ds.query(`INSERT INTO media (address) VALUES ('autre.png') RETURNING id`);
      const [{ id: otherService }] = await ds.query(
        `INSERT INTO service ("categoryId", title, "mediaId")
         SELECT "categoryId", 'Autre', $2 FROM service WHERE id = $1 RETURNING id`,
        [world.serviceId, mediaId],
      );
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        k(0),
        otherService,
      ]);
      const orderId = await openOffer();
      const http = new FakeHttp();
      http.durations = (n) => Array.from({ length: n }, (_, i) => 1000 - i * 10); // le plus loin, le plus rapide
      const { waves } = buildDispatchWaves(ds, redis, d, new RecordingQueue(), realRouting(http));
      const w1 = await waves.runWave({ orderId, wave: 1 });

      expect(http.calls).toHaveLength(1);
      expect(http.calls[0].params.sources.split(';')).toHaveLength(10);
      expect(w1.added).not.toContain(k(0));
      // Les 10 plus proches mono-service (k1 a k10), classes par la route : k10 a k6.
      expect(w1.added).toEqual([k(10), k(9), k(8), k(7), k(6)]);
    });
  });

  describe('D6 : demande non servie (Q12)', () => {
    async function unservedOrder(km: number): Promise<number> {
      const orderId = await createOrder(ds, world, { status: OrderStatus.Expired });
      const p = at(km);
      await ds.query(`UPDATE request SET points = ST_GeomFromText($2, 4326) WHERE id = $1`, [
        orderId,
        `MULTIPOINT((${p.lng} ${p.lat}),(-17.5065 14.7392))`,
      ]);
      return orderId;
    }

    it('3 demandes a moins de 1 km en 15 min : push aux Kasimen en ligne a moins de 5 km, une fois par heure', async () => {
      await setUp(3);
      await place({ 0: 2, 1: 6, 2: 1 });
      await ds.query(`UPDATE driver SET status = 'offline' WHERE id = $1`, [k(2)]);
      const { unserved } = buildDispatchWaves(ds, redis, d);
      const record = async (orderId: number) => unserved.record(await orderRow(ds, orderId), 0);

      expect((await record(await unservedOrder(3))).alerted).toBe(false); // a 3 km : autre zone
      expect((await record(await unservedOrder(0))).alerted).toBe(false);
      expect((await record(await unservedOrder(0.3))).alerted).toBe(false);
      const third = await unservedOrder(0.5);
      // k(1) a 6 km, k(2) hors ligne : seul k(0) est prevenu.
      expect(await record(third)).toEqual({ recorded: true, alerted: true, notified: [k(0)] });
      const texts = d.driverNotifications.args.filter((a) => a.method === 'plainText');
      expect(texts).toHaveLength(1);
      expect(texts[0].args.slice(1)).toEqual([UNSERVED_DEMAND_PUSH.title, UNSERVED_DEMAND_PUSH.body]);
      expect((texts[0].args[0] as { id: number }).id).toBe(k(0));
      expect(await record(third)).toMatchObject({ recorded: false, alerted: false }); // rejeu

      // Meme zone dans l'heure : inscrite, pas de nouvelle push.
      expect(await record(await unservedOrder(0.2))).toMatchObject({ recorded: true, alerted: false });
      expect(d.driverNotifications.count('plainText')).toBe(1);

      // Une heure plus tard (alerte vieillie), la zone peut de nouveau alerter.
      await ds.query(
        `UPDATE unserved_demand SET "alertedAt" = "alertedAt" - interval '61 minutes' WHERE "alertedAt" IS NOT NULL`,
      );
      expect((await record(await unservedOrder(0.1))).alerted).toBe(true);
      expect(d.driverNotifications.count('plainText')).toBe(2);
      const rows = await ds.query(`SELECT "alertedDrivers" FROM unserved_demand WHERE "alertedAt" IS NOT NULL`);
      expect(rows).toEqual([{ alertedDrivers: 1 }, { alertedDrivers: 1 }]);
    });

    it('fenetre de 15 min ; deux expirations simultanees au seuil = une seule push', async () => {
      await setUp(1);
      await place({ 0: 1 });
      const { unserved } = buildDispatchWaves(ds, redis, d);
      const record = async (orderId: number) => unserved.record(await orderRow(ds, orderId), 0);

      await record(await unservedOrder(0));
      await record(await unservedOrder(0.1));
      await ds.query(`UPDATE unserved_demand SET "createdAt" = "createdAt" - interval '16 minutes'`);
      expect((await record(await unservedOrder(0.2))).alerted).toBe(false); // les 2 premieres sont trop vieilles
      expect((await record(await unservedOrder(0.3))).alerted).toBe(false);

      const a = await unservedOrder(0.4);
      const b = await unservedOrder(0.5);
      const results = await concurrently(2, async (i) => record(i === 0 ? a : b));
      const alerted = results.filter((r) => r.status === 'fulfilled' && r.value.alerted);
      expect(alerted).toHaveLength(1);
      expect(d.driverNotifications.count('plainText')).toBe(1);
    });

    it('legacy : aucune ligne de journal, refus sans effet', async () => {
      await setUp(2);
      process.env.DISPATCH_MODE = 'legacy';
      await place({ 0: 0.3, 1: 0.6 });
      const orderId = await openOffer();
      const { waves } = buildDispatchWaves(ds, redis, d);
      await buildDriverApi(ds, redis, d, k(0)).update(orderId, { status: OrderStatus.DriverAccepted });
      expect(await waves.reject(orderId, k(1))).toBe(false);
      expect(await ds.query(`SELECT 1 FROM dispatch_attempt`)).toHaveLength(0);
      expect(await ds.query(`SELECT 1 FROM unserved_demand`)).toHaveLength(0);
    });
  });
});
