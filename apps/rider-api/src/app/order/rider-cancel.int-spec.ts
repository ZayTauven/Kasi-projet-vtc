/**
 * p1-transitions + p1-unicite cote client (rider-api) : annulation, avis,
 * retour de passerelle sur une course en attente de paiement.
 *
 *   npm run test:integration -- rider-cancel
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  activityCount,
  buildDriverApi,
  buildRiderApi,
  concurrently,
  countRows,
  createOrder,
  createWorld,
  Doubles,
  driverStatus,
  DriverStatus,
  errorOf,
  fakeReply,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';

describe('rider-api : annulation par le client et paiement', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
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
    d = makeDoubles();
    // Frais d'annulation : 500, dont 300 pour le Kasiman.
    world = await createWorld(ds, {
      drivers: 2,
      cancellationTotalFee: 500,
      cancellationDriverShare: 300,
      providerSharePercent: 10,
    });
  });

  const rider = () => buildRiderApi(ds, redis, d);
  const driver = (i = 0) => buildDriverApi(ds, redis, d, world.driverIds[i]);
  /** Ce qu'envoie rider-app (order_status_sheet_view.dart) pour annuler. */
  const cancelUpdate = {
    status: OrderStatus.RiderCanceled,
    waitMinutes: 0,
    tipAmount: 0,
  };

  async function acceptedOrder(): Promise<number> {
    const orderId = await createOrder(ds, world);
    await driver(0).update(orderId, { status: OrderStatus.DriverAccepted });
    return orderId;
  }

  it('annulation client APRES acceptation, course en especes (commande #163) : pas d erreur, Kasiman libere, frais une fois', async () => {
    const orderId = await acceptedOrder();
    expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.InService);
    // Aucun credit client, aucune preautorisation : c'est le cas qui levait
    // « reading 'transactionNumber' » et laissait le Kasiman « in service ».
    const result = await rider().update(orderId, world.riderId, cancelUpdate);
    expect(result.status).toBe(OrderStatus.RiderCanceled);
    expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.Online);
    expect(await activityCount(ds, orderId, 'CanceledByRider')).toBe(1);
    expect(d.driverNotifications.count('canceled')).toBe(1);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(-500);
    expect(
      await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
    ).toBe(300);
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200);
    // Le Kasiman libere peut accepter une nouvelle offre.
    const next = await createOrder(ds, world);
    await driver(0).update(next, { status: OrderStatus.DriverAccepted });
    expect((await orderRow(ds, next)).driverId).toBe(world.driverIds[0]);
  });

  it('annulation rejouee (sequentiel, simultane, puis mutation cancelOrder) : frais preleves une seule fois', async () => {
    const orderId = await acceptedOrder();
    await rider().update(orderId, world.riderId, cancelUpdate);
    await rider().update(orderId, world.riderId, cancelUpdate);
    const results = await concurrently(4, () =>
      rider().update(orderId, world.riderId, cancelUpdate),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    // Mutation `cancelOrder` (sans argument) rejouee apres coup : plus de
    // course « en cours », elle renvoie la course annulee au lieu d'une erreur.
    const again = await rider().riderOrderService.cancelRiderLastOrder(world.riderId);
    expect(again.id).toBe(orderId);
    expect(again.status).toBe(OrderStatus.RiderCanceled);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(-500);
    expect(await countRows(ds, 'rider_transaction')).toBe(1);
    expect(await countRows(ds, 'driver_transaction')).toBe(1);
    expect(await countRows(ds, 'admin_transaction')).toBe(1);
    expect(await activityCount(ds, orderId, 'CanceledByRider')).toBe(1);
    expect(d.driverNotifications.count('canceled')).toBe(1);
  });

  it('annulation simultanee par les deux mutations du client : une seule annulation', async () => {
    const orderId = await acceptedOrder();
    const results = await Promise.allSettled([
      rider().update(orderId, world.riderId, cancelUpdate),
      rider().riderOrderService.cancelRiderLastOrder(world.riderId),
      rider().riderOrderService.cancelOrder(orderId, world.riderId),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await countRows(ds, 'rider_transaction')).toBe(1);
    expect(await activityCount(ds, orderId, 'CanceledByRider')).toBe(1);
  });

  it('offre encore ouverte : annulation sans frais, retiree des offres', async () => {
    const orderId = await createOrder(ds, world);
    const result = await rider().update(orderId, world.riderId, cancelUpdate);
    expect(result.status).toBe(OrderStatus.RiderCanceled);
    expect(await countRows(ds, 'rider_transaction')).toBe(0);
    expect(d.pubSub.count('orderRemoved')).toBe(1);
  });

  it('annulation client et acceptation Kasiman en meme temps (10 fois) : etat coherent, Kasiman jamais bloque', async () => {
    for (let i = 0; i < 10; i++) {
      await ds.query(`UPDATE driver SET status = 'online'`);
      const orderId = await createOrder(ds, world);
      const [accept, cancel] = await Promise.allSettled([
        driver(0).update(orderId, { status: OrderStatus.DriverAccepted }),
        rider().update(orderId, world.riderId, cancelUpdate),
      ]);
      expect(cancel.status).toBe('fulfilled');
      const order = await orderRow(ds, orderId);
      expect(order.status).toBe(OrderStatus.RiderCanceled);
      expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.Online);
      expect(await activityCount(ds, orderId, 'CanceledByRider')).toBe(1);
      if (accept.status === 'rejected') {
        expect(accept.reason.message).toBe('Already Taken');
        expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(0);
      } else {
        expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
      }
    }
  });

  it('course payee, terminee ou annulee par le Kasiman : CANCEL_NOT_ALLOWED, rien n est ecrit', async () => {
    for (const status of [
      OrderStatus.WaitingForReview,
      OrderStatus.Finished,
      OrderStatus.DriverCanceled,
      OrderStatus.WaitingForPostPay,
    ]) {
      const orderId = await createOrder(ds, world, {
        status,
        driverId: world.driverIds[0],
      });
      expect(
        await errorOf(rider().update(orderId, world.riderId, cancelUpdate)),
      ).toBe('CANCEL_NOT_ALLOWED');
      expect((await orderRow(ds, orderId)).status).toBe(status);
    }
    expect(await countRows(ds, 'rider_transaction')).toBe(0);
  });

  it('la course d un autre client ne peut pas etre annulee', async () => {
    const orderId = await acceptedOrder();
    const [{ id: otherRider }] = await ds.query(
      `INSERT INTO rider ("mobileNumber") VALUES (221770000099) RETURNING id`,
    );
    expect(
      await errorOf(rider().update(orderId, otherRider, cancelUpdate)),
    ).not.toBeNull();
    expect(
      await errorOf(rider().riderOrderService.cancelOrder(orderId, otherRider)),
    ).toBe('CANCEL_NOT_ALLOWED');
    expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.DriverAccepted);
  });

  it('avis sur une course en attente de paiement : refuse (ne la passe plus en Finished)', async () => {
    const orderId = await createOrder(ds, world, {
      status: OrderStatus.WaitingForPostPay,
      driverId: world.driverIds[0],
    });
    expect(
      await errorOf(
        rider().riderOrderService.submitReview(world.riderId, {
          requestId: orderId,
          score: 5,
        } as never),
      ),
    ).toBe('Not Allowed');
    expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForPostPay);
  });

  it('paiement par passerelle d une course en attente, retour rejoue en meme temps : credit, paiement et commissions une seule fois', async () => {
    const orderId = await createOrder(ds, world, {
      status: OrderStatus.WaitingForPostPay,
      driverId: world.driverIds[0],
    });
    const token = JSON.stringify({
      userType: 'client',
      userId: world.riderId,
      status: 'success',
      amount: 5000,
      currency: 'XOF',
      transactionNumber: 'WAVE-777',
      gatewayId: world.gatewayId,
    });
    const results = await concurrently(3, () =>
      rider().controller.verifyPayment(
        { query: { token, redirect: '0' } } as never,
        fakeReply() as never,
      ),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
    // +5000 (recharge) - 2000 (course)
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(3000);
    // +2000 (course) - 200 (commission de 10 %)
    expect(
      await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
    ).toBe(1800);
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200);
    expect(await countRows(ds, 'rider_transaction')).toBe(2);
    expect(await activityCount(ds, orderId, 'Paid')).toBe(1);
    expect(await driverStatus(ds, world.driverIds[0])).toBe(DriverStatus.Online);
  });
});
