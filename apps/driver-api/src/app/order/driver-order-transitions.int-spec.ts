/**
 * p1-transitions : transitions de course cote Kasiman (mutation updateOneOrder
 * de driver-api), contre PostgreSQL et Redis reels. Anomalies couvertes :
 * bug-double-assignation, bug-annulation, bug-doublon-statut.
 *
 *   npm run test:integration -- driver-order-transitions
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  activityCount,
  buildDriverApi,
  concurrently,
  createOrder,
  createWorld,
  Doubles,
  driverStatus,
  DriverStatus,
  errorOf,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';

describe('p1-transitions : updateOneOrder de driver-api', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  const api = (driverIndex: number) =>
    buildDriverApi(ds, redis, d, world.driverIds[driverIndex]);

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
    d = makeDoubles();
    world = await createWorld(ds, { drivers: 3, providerSharePercent: 10 });
  });

  /** Course amenee au statut voulu par les vraies transitions. */
  async function orderAt(status: OrderStatus, driverIndex = 0): Promise<number> {
    const orderId = await createOrder(ds, world);
    const steps = [
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
      OrderStatus.Started,
    ];
    for (const step of steps.slice(0, steps.indexOf(status) + 1)) {
      await api(driverIndex).update(orderId, { status: step });
    }
    return orderId;
  }

  describe('acceptation (bug-double-assignation)', () => {
    it('deux acceptations simultanees, 25 fois : exactement une reussit et une seule activite', async () => {
      for (let i = 0; i < 25; i++) {
        await ds.query(`UPDATE driver SET status = 'online'`);
        const orderId = await createOrder(ds, world);
        const results = await Promise.allSettled([
          api(0).update(orderId, { status: OrderStatus.DriverAccepted }),
          api(1).update(orderId, { status: OrderStatus.DriverAccepted }),
        ]);
        const won = results.filter((r) => r.status === 'fulfilled');
        const lost = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );
        expect(won).toHaveLength(1);
        expect(lost).toHaveLength(1);
        // Le texte que driver-app affiche deja tel quel.
        expect(lost[0].reason.message).toBe('Already Taken');
        const winner = results[0].status === 'fulfilled' ? 0 : 1;
        const loser = 1 - winner;
        const order = await orderRow(ds, orderId);
        expect(order.status).toBe(OrderStatus.DriverAccepted);
        expect(order.driverId).toBe(world.driverIds[winner]);
        expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
        expect(await driverStatus(ds, world.driverIds[winner])).toBe(
          DriverStatus.InService,
        );
        expect(await driverStatus(ds, world.driverIds[loser])).toBe(
          DriverStatus.Online,
        );
      }
      expect(d.riderNotifications.count('accepted')).toBe(25);
      expect(d.pubSub.count('orderRemoved')).toBe(25);
    });

    it('trois Kasimen en meme temps sur la meme offre : un seul attribue', async () => {
      const orderId = await createOrder(ds, world);
      const results = await concurrently(3, (i) =>
        api(i).update(orderId, { status: OrderStatus.DriverAccepted }),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
      expect(d.riderNotifications.count('accepted')).toBe(1);
    });

    it('rejeu du gagnant (sequentiel puis simultane) : pas d erreur, rien de duplique', async () => {
      const orderId = await createOrder(ds, world);
      await api(0).update(orderId, { status: OrderStatus.DriverAccepted });
      const replay = await api(0).update(orderId, {
        status: OrderStatus.DriverAccepted,
      });
      expect(replay.status).toBe(OrderStatus.DriverAccepted);
      const results = await concurrently(4, () =>
        api(0).update(orderId, { status: OrderStatus.DriverAccepted }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
      expect(d.riderNotifications.count('accepted')).toBe(1);
    });

    it('offre deja prise ou annulee : Already Taken, sans activite', async () => {
      const taken = await orderAt(OrderStatus.DriverAccepted, 0);
      expect(
        await errorOf(api(1).update(taken, { status: OrderStatus.DriverAccepted })),
      ).toBe('Already Taken');
      const canceled = await createOrder(ds, world, {
        status: OrderStatus.RiderCanceled,
      });
      expect(
        await errorOf(
          api(1).update(canceled, { status: OrderStatus.DriverAccepted }),
        ),
      ).toBe('Already Taken');
      expect(await activityCount(ds, canceled)).toBe(0);
      expect(await activityCount(ds, taken, 'DriverAccepted')).toBe(1);
    });
  });

  describe('annulation par le Kasiman (bug-annulation)', () => {
    it('renvoie la course annulee sans erreur, sans activite « acceptee » supplementaire', async () => {
      const orderId = await orderAt(OrderStatus.DriverAccepted);
      const result = await api(0).update(orderId, {
        status: OrderStatus.DriverCanceled,
      });
      expect(result.status).toBe(OrderStatus.DriverCanceled);
      expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
      expect(await activityCount(ds, orderId, 'CanceledByDriver')).toBe(1);
      expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.Online);
      expect(d.riderNotifications.count('canceled')).toBe(1);
    });

    it('rejeu sequentiel et simultane : une activite, une notification, jamais d erreur', async () => {
      const orderId = await orderAt(OrderStatus.Arrived);
      await api(0).update(orderId, { status: OrderStatus.DriverCanceled });
      const results = await concurrently(4, () =>
        api(0).update(orderId, { status: OrderStatus.DriverCanceled }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(await activityCount(ds, orderId, 'CanceledByDriver')).toBe(1);
      expect(d.riderNotifications.count('canceled')).toBe(1);
    });

    it('course demarree ou course d un autre Kasiman : CANCEL_NOT_ALLOWED', async () => {
      const started = await orderAt(OrderStatus.Started);
      expect(
        await errorOf(api(0).update(started, { status: OrderStatus.DriverCanceled })),
      ).toBe('CANCEL_NOT_ALLOWED');
      const other = await orderAt(OrderStatus.DriverAccepted, 0);
      expect(
        await errorOf(api(1).update(other, { status: OrderStatus.DriverCanceled })),
      ).toBe('CANCEL_NOT_ALLOWED');
      expect((await orderRow(ds, other)).status).toBe(OrderStatus.DriverAccepted);
      expect(await activityCount(ds, other, 'CanceledByDriver')).toBe(0);
    });
  });

  describe('arrivee, demarrage, fin (bug-doublon-statut)', () => {
    it('Arrived rejoue (3 fois simultanement + 2 fois ensuite) : une activite, un push', async () => {
      const orderId = await orderAt(OrderStatus.DriverAccepted);
      const results = await concurrently(3, () =>
        api(0).update(orderId, { status: OrderStatus.Arrived }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      await api(0).update(orderId, { status: OrderStatus.Arrived });
      await api(0).update(orderId, { status: OrderStatus.Arrived });
      expect(await activityCount(ds, orderId, 'ArrivedToPickupPoint')).toBe(1);
      expect(d.riderNotifications.count('arrived')).toBe(1);
    });

    it('Started rejoue : une activite, un push', async () => {
      const orderId = await orderAt(OrderStatus.Arrived);
      const results = await concurrently(3, () =>
        api(0).update(orderId, { status: OrderStatus.Started }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      await api(0).update(orderId, { status: OrderStatus.Started });
      expect(await activityCount(ds, orderId, 'Started')).toBe(1);
      expect(d.riderNotifications.count('started')).toBe(1);
    });

    it('rejeu tardif de Arrived apres Started : renvoie la course demarree sans la faire reculer', async () => {
      const orderId = await orderAt(OrderStatus.Started);
      const result = await api(0).update(orderId, { status: OrderStatus.Arrived });
      expect(result.status).toBe(OrderStatus.Started);
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.Started);
      expect(await activityCount(ds, orderId, 'ArrivedToPickupPoint')).toBe(1);
      expect(d.riderNotifications.count('arrived')).toBe(1);
    });

    it('fin de course especes rejouee simultanement : une activite, un push, commission prelevee une fois', async () => {
      const orderId = await orderAt(OrderStatus.Started);
      // 1) le Kasiman glisse « terminer » : pas de credit client -> attente de paiement
      const first = await concurrently(3, () =>
        api(0).update(orderId, { status: OrderStatus.Finished }),
      );
      expect(first.every((r) => r.status === 'fulfilled')).toBe(true);
      expect((await orderRow(ds, orderId)).status).toBe(
        OrderStatus.WaitingForPostPay,
      );
      expect(d.riderNotifications.count('waitingForPostPay')).toBe(1);
      // 2) il encaisse les especes : rejoue 4 fois en meme temps
      const cash = await concurrently(4, () =>
        api(0).update(orderId, {
          status: OrderStatus.Finished,
          paidAmount: 2000,
        }),
      );
      expect(cash.every((r) => r.status === 'fulfilled')).toBe(true);
      await api(0).update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 });
      const order = await orderRow(ds, orderId);
      expect(order.status).toBe(OrderStatus.WaitingForReview);
      expect(await activityCount(ds, orderId, 'ArrivedToDestination')).toBe(1);
      expect(await activityCount(ds, orderId, 'Paid')).toBe(1);
      expect(d.riderNotifications.count('finished')).toBe(1);
      // Commission de 10 % sur 2 000 : prelevee une seule fois.
      expect(
        await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
      ).toBe(-200);
      expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200);
      expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.Online);
    });

    it('fin de course payee par le portefeuille, rejouee : chaque mouvement une seule fois', async () => {
      await ds.query(
        `INSERT INTO rider_wallet (amount, currency, "riderId") VALUES (5000, 'XOF', $1)`,
        [world.riderId],
      );
      const orderId = await orderAt(OrderStatus.Started);
      const results = await concurrently(5, () =>
        api(0).update(orderId, { status: OrderStatus.Finished }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect((await orderRow(ds, orderId)).status).toBe(
        OrderStatus.WaitingForReview,
      );
      expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(
        3000,
      );
      // +2000 (course) - 200 (commission)
      expect(
        await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
      ).toBe(1800);
      expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200);
      const [{ n }] = await ds.query(
        `SELECT count(*)::int AS n FROM driver_transaction WHERE "requestId" = $1`,
        [orderId],
      );
      expect(n).toBe(2);
      expect(d.riderNotifications.count('finished')).toBe(1);
    });

    it('transitions interdites : refusees sans rien ecrire', async () => {
      const requested = await createOrder(ds, world);
      for (const status of [
        OrderStatus.Arrived,
        OrderStatus.Started,
        OrderStatus.Finished,
      ]) {
        expect(await errorOf(api(0).update(requested, { status }))).toBe(
          'Update status to this is not possible',
        );
      }
      const accepted = await orderAt(OrderStatus.DriverAccepted);
      // Demarrer sans etre arrive, terminer sans avoir demarre.
      expect(
        await errorOf(api(0).update(accepted, { status: OrderStatus.Started })),
      ).toBe('Update status to this is not possible');
      expect(
        await errorOf(api(0).update(accepted, { status: OrderStatus.Finished })),
      ).toBe('Update status to this is not possible');
      // La course d un autre Kasiman.
      expect(
        await errorOf(api(1).update(accepted, { status: OrderStatus.Arrived })),
      ).toBe('Update status to this is not possible');
      // Un statut que le Kasiman ne peut pas demander.
      expect(
        await errorOf(api(0).update(accepted, { status: OrderStatus.RiderCanceled })),
      ).toBe('Update status to this is not possible');
      // paidAmount sans statut n est plus ecrit.
      await api(0).update(accepted, { paidAmount: 999 });
      expect((await orderRow(ds, accepted)).paidAmount).toBe(0);
      expect((await orderRow(ds, accepted)).status).toBe(OrderStatus.DriverAccepted);
      expect((await orderRow(ds, requested)).status).toBe(OrderStatus.Requested);
      expect(await activityCount(ds, requested)).toBe(0);
      expect(await activityCount(ds, accepted)).toBe(1);
    });
  });

  describe('expiration des offres (cron)', () => {
    it('une course acceptee entre la lecture de Redis et l ecriture n est pas expiree', async () => {
      const open = await createOrder(ds, world);
      const accepted = await orderAt(OrderStatus.DriverAccepted);
      const expired = await api(0).orderService.expireOrders([open, accepted]);
      expect(expired).toEqual([open]);
      expect((await orderRow(ds, open)).status).toBe(OrderStatus.Expired);
      expect((await orderRow(ds, accepted)).status).toBe(OrderStatus.DriverAccepted);
      expect(await activityCount(ds, accepted, 'Expired')).toBe(0);
      expect(await activityCount(ds, open, 'Expired')).toBe(1);
    });
  });

  describe('50 courses d affilee avec concurrence et rejeux (critere de sortie phase 1)', () => {
    it('ni double assignation, ni doublon d activite, ni double prelevement', async () => {
      const COURSES = 50;
      for (let i = 0; i < COURSES; i++) {
        await ds.query(`UPDATE driver SET status = 'online'`);
        const orderId = await createOrder(ds, world);
        // Trois Kasimen acceptent en meme temps.
        const accept = await concurrently(3, (k) =>
          api(k).update(orderId, { status: OrderStatus.DriverAccepted }),
        );
        const winner = accept.findIndex((r) => r.status === 'fulfilled');
        expect(accept.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        const me = api(winner);
        // Chaque etape envoyee deux fois en meme temps (timeout de 20 s), puis rejouee.
        for (const status of [
          OrderStatus.DriverAccepted,
          OrderStatus.Arrived,
          OrderStatus.Started,
        ]) {
          const r = await concurrently(2, () => me.update(orderId, { status }));
          expect(r.every((x) => x.status === 'fulfilled')).toBe(true);
          await me.update(orderId, { status });
        }
        const fin = await concurrently(2, () =>
          me.update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 }),
        );
        expect(fin.every((x) => x.status === 'fulfilled')).toBe(true);
        await me.update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 });
        const order = await orderRow(ds, orderId);
        expect(order.status).toBe(OrderStatus.WaitingForReview);
        expect(order.driverId).toBe(world.driverIds[winner]);
        const rows: Array<{ type: string; n: number }> = await ds.query(
          `SELECT type, count(*)::int AS n FROM request_activity WHERE "requestId" = $1 GROUP BY type`,
          [orderId],
        );
        expect(Object.fromEntries(rows.map((r) => [r.type, r.n]))).toEqual({
          DriverAccepted: 1,
          ArrivedToPickupPoint: 1,
          Started: 1,
          ArrivedToDestination: 1,
          Paid: 1,
        });
      }
      // Une commission de 200 par course, jamais deux.
      const [{ n, total }] = await ds.query(
        `SELECT count(*)::int AS n, sum(amount)::float AS total FROM driver_transaction WHERE "deductType" = 'Commission'`,
      );
      expect(n).toBe(COURSES);
      expect(total).toBe(-200 * COURSES);
      expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200 * COURSES);
      expect(d.riderNotifications.count('accepted')).toBe(COURSES);
      expect(d.riderNotifications.count('arrived')).toBe(COURSES);
      expect(d.riderNotifications.count('started')).toBe(COURSES);
      expect(d.riderNotifications.count('finished')).toBe(COURSES);
    });
  });
});
