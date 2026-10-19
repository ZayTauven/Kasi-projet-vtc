/**
 * p2-argent I1 (2026-10-19) : updateOneOrder de rider-api hors annulation
 * (pourboire, temps d'attente, coupon), contre PostgreSQL reel. Anomalies A2
 * (pourboire negatif, a tout statut) et A3 (attente et coupon modifiables
 * apres le demarrage) de docs/fiche-conception-argent.md ; A7 (part
 * d'annulation du Kasiman enregistree comme un gain).
 *
 *   npm run test:integration -- rider-order-update
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildDriverApi,
  buildRiderApi,
  createCoupon,
  createOrder,
  createWorld,
  Doubles,
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
import { RiderOrderUpdateRefusal } from './rider-order.query-service';

describe('p2-argent I1 : updateOneOrder de rider-api (pourboire, attente, coupon)', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  const rider = () => buildRiderApi(ds, redis, d);
  const update = (orderId: number, change: Record<string, unknown>) =>
    rider().update(orderId, world.riderId, change);

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
    // Attente : 100 par minute. Frais d'annulation : 500, dont 300 au Kasiman.
    world = await createWorld(ds, {
      drivers: 1,
      perMinuteWait: 100,
      cancellationTotalFee: 500,
      cancellationDriverShare: 300,
    });
  });

  const orderAt = (status: OrderStatus) =>
    createOrder(ds, world, {
      status,
      driverId: status === OrderStatus.Requested ? null : world.driverIds[0],
    });

  describe('pourboire (A2)', () => {
    it('pourboire negatif refuse a tout statut, rien d ecrit', async () => {
      for (const status of [
        OrderStatus.DriverAccepted,
        OrderStatus.Started,
        OrderStatus.WaitingForPostPay,
      ]) {
        const orderId = await orderAt(status);
        expect(await errorOf(update(orderId, { tipAmount: -1500 }))).toBe(
          RiderOrderUpdateRefusal.NegativeTip,
        );
        expect((await orderRow(ds, orderId)).tipAmount).toBe(0);
      }
    });

    it('pourboire accepte jusqu au paiement, refuse apres', async () => {
      const started = await orderAt(OrderStatus.Started);
      await update(started, { tipAmount: 500 });
      expect((await orderRow(ds, started)).tipAmount).toBe(500);
      // Ecran de paiement de rider-app (PayRide, WaitingForPostPay).
      const waiting = await orderAt(OrderStatus.WaitingForPostPay);
      await update(waiting, { tipAmount: 300 });
      expect((await orderRow(ds, waiting)).tipAmount).toBe(300);
      const paid = await orderAt(OrderStatus.WaitingForReview);
      expect(await errorOf(update(paid, { tipAmount: 1000 }))).toBe(
        RiderOrderUpdateRefusal.TipFrozen,
      );
      // Valeur inchangee (0 envoye par l'app) : sans effet, sans erreur.
      await update(paid, { tipAmount: 0 });
      expect((await orderRow(ds, paid)).tipAmount).toBe(0);
    });

    it('pourboire sur la course d un autre client : refuse', async () => {
      const orderId = await orderAt(OrderStatus.Started);
      const [{ id: otherRiderId }] = await ds.query(
        `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000002, 'Autre') RETURNING id`,
      );
      expect(
        await errorOf(rider().update(orderId, otherRiderId, { tipAmount: 500 })),
      ).not.toBeNull();
      expect((await orderRow(ds, orderId)).tipAmount).toBe(0);
    });
  });

  describe('attente et coupon geles apres le demarrage (A3)', () => {
    it('attente acceptee avant le demarrage, refusee apres', async () => {
      const orderId = await orderAt(OrderStatus.Arrived);
      await update(orderId, { waitMinutes: 5 });
      let order = await orderRow(ds, orderId);
      expect(order.waitMinutes).toBe(5);
      expect(order.costAfterCoupon).toBe(2500);
      await ds.query(`UPDATE request SET status = 'Started' WHERE id = $1`, [orderId]);
      expect(await errorOf(update(orderId, { waitMinutes: 10 }))).toBe(
        RiderOrderUpdateRefusal.WaitFrozen,
      );
      expect(await errorOf(update(orderId, { waitMinutes: -3 }))).toBe(
        RiderOrderUpdateRefusal.NegativeWait,
      );
      order = await orderRow(ds, orderId);
      expect(order.waitMinutes).toBe(5);
      expect(order.costAfterCoupon).toBe(2500);
    });

    it('coupon accepte avant le demarrage, refuse apres (et apres paiement)', async () => {
      await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
      const accepted = await orderAt(OrderStatus.DriverAccepted);
      await update(accepted, { couponCode: 'PROMO10' });
      const order = await orderRow(ds, accepted);
      expect(order.couponId).not.toBeNull();
      expect(order.costAfterCoupon).toBe(1800);
      for (const status of [OrderStatus.Started, OrderStatus.WaitingForReview]) {
        const orderId = await orderAt(status);
        expect(await errorOf(update(orderId, { couponCode: 'PROMO10' }))).toBe(
          RiderOrderUpdateRefusal.CouponFrozen,
        );
        const row = await orderRow(ds, orderId);
        expect(row.couponId ?? null).toBeNull();
        expect(row.costAfterCoupon).toBe(2000);
      }
    });

    it('statut demande : refuse AVANT d appliquer le coupon', async () => {
      await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
      const orderId = await orderAt(OrderStatus.DriverAccepted);
      expect(
        await errorOf(
          update(orderId, { couponCode: 'PROMO10', status: OrderStatus.Finished }),
        ),
      ).toBe('Update status to this is not possible');
      expect((await orderRow(ds, orderId)).couponId ?? null).toBeNull();
    });

    it('annulation telle que l envoie rider-app (tipAmount 0, waitMinutes 0) : toujours acceptee', async () => {
      const orderId = await orderAt(OrderStatus.Arrived);
      await update(orderId, { status: OrderStatus.RiderCanceled, tipAmount: 0, waitMinutes: 0 });
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.RiderCanceled);
    });
  });

  describe('part d annulation du Kasiman (A7)', () => {
    it('enregistree comme un gain (Recharge / OrderFee), montant inchange', async () => {
      const orderId = await createOrder(ds, world);
      await buildDriverApi(ds, redis, d, world.driverIds[0]).update(orderId, {
        status: OrderStatus.DriverAccepted,
      });
      await update(orderId, { status: OrderStatus.RiderCanceled, tipAmount: 0, waitMinutes: 0 });
      const rows = await ds.query(
        `SELECT action, "rechargeType", "deductType", amount::float AS amount
           FROM driver_transaction WHERE "requestId" = $1`,
        [orderId],
      );
      expect(rows).toEqual([
        { action: 'Recharge', rechargeType: 'OrderFee', deductType: null, amount: 300 },
      ]);
      expect(
        await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
      ).toBe(300);
    });
  });
});
