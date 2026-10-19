/**
 * admin-api : operations d'argent manuelles, versements (p1-unicite) et
 * actions de l'operateur sur une course (p1-transitions).
 *
 *   npm run test:integration -- admin-money
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  activityCount,
  buildAdminApi,
  buildDriverApi,
  concurrently,
  countRows,
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
import { TransactionAction } from '../../../../../libs/database/src/lib/entities/enums/transaction-action.enum';
import { RiderRechargeTransactionType } from '../../../../../libs/database/src/lib/entities/enums/rider-recharge-transaction-type.enum';
import { DriverRechargeTransactionType } from '../../../../../libs/database/src/lib/entities/enums/driver-recharge-transaction-type.enum';

describe('admin-api : argent et actions operateur', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let operatorId: number;
  const admin = () => buildAdminApi(ds, redis, d, operatorId);

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
    world = await createWorld(ds, { drivers: 2, providerSharePercent: 10 });
    [{ id: operatorId }] = await ds.query(
      `INSERT INTO operator ("userName") VALUES ('operateur-test') RETURNING id`,
    );
  });

  const riderCredit = (idempotencyKey?: string) =>
    admin().riderResolver.createRiderTransaction({
      riderId: world.riderId,
      action: TransactionAction.Recharge,
      rechargeType: RiderRechargeTransactionType.Correction,
      amount: 1500,
      currency: 'XOF',
      idempotencyKey,
    } as never);

  it('credit manuel avec cle (double envoi du formulaire, simultane) : ecrit une fois', async () => {
    const results = await concurrently(4, () => riderCredit('form-42'));
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    await riderCredit('form-42');
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(1500);
    const [row] = await ds.query(`SELECT "idempotencyKey", "operatorId" FROM rider_transaction`);
    expect(row.idempotencyKey).toBe('operator:form-42');
    expect(row.operatorId).toBe(operatorId);
  });

  it('credit manuel sans cle : chaque appel est une operation (historique), solde exact en concurrence', async () => {
    const results = await concurrently(5, () => riderCredit());
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(7500);
    expect(await countRows(ds, 'rider_transaction')).toBe(5);
  });

  it('debit manuel Kasiman avec cle rejoue : une seule ligne', async () => {
    await concurrently(3, () =>
      admin().driverResolver.createDriverTransaction({
        driverId: world.driverIds[0],
        action: TransactionAction.Deduct,
        rechargeType: DriverRechargeTransactionType.BankTransfer,
        amount: 400,
        currency: 'XOF',
        idempotencyKey: 'debit-7',
      } as never),
    );
    expect(
      await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
    ).toBe(-400);
    expect(await countRows(ds, 'driver_transaction')).toBe(1);
  });

  describe('versements (payout)', () => {
    async function pendingPayout(amount: number): Promise<number> {
      await ds.query(
        `INSERT INTO driver_wallet (amount, currency, "driverId") VALUES (10000, 'XOF', $1)`,
        [world.driverIds[0]],
      );
      const [{ id: sessionId }] = await ds.query(
        `INSERT INTO payout_session (currency) VALUES ('XOF') RETURNING id`,
      );
      const [{ id }] = await ds.query(
        `INSERT INTO payout ("sessionId", "driverId", amount, currency, "methodType", "methodName")
         VALUES ($1, $2, $3, 'XOF', 'Wave', 'Wave') RETURNING id`,
        [sessionId, world.driverIds[0], amount],
      );
      return id;
    }

    it('deux validations simultanees du meme versement : debite une fois', async () => {
      const payoutId = await pendingPayout(6000);
      const results = await concurrently(4, () =>
        admin().payoutService.processPayout(payoutId, operatorId),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(
        await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
      ).toBe(4000);
      expect(await countRows(ds, 'driver_transaction')).toBe(1);
      const [payout] = await ds.query(`SELECT status, "driverTransactionId" FROM payout`);
      expect(payout.status).toBe('Paid');
      expect(payout.driverTransactionId).not.toBeNull();
    });

    it('solde insuffisant : refuse, versement toujours en attente, rien d ecrit', async () => {
      const payoutId = await pendingPayout(20000);
      expect(
        await errorOf(admin().payoutService.processPayout(payoutId, operatorId)),
      ).toBe('INSUFFICIENT_DRIVER_BALANCE');
      const [payout] = await ds.query(`SELECT status FROM payout`);
      expect(payout.status).toBe('Pending');
      expect(await countRows(ds, 'driver_transaction')).toBe(0);
    });
  });

  describe('actions operateur sur une course', () => {
    it('annulation operateur rejouee : une activite ; refusee sur une course payee', async () => {
      const open = await createOrder(ds, world);
      await concurrently(3, () => admin().orderService.cancelOrder(open));
      expect((await orderRow(ds, open)).status).toBe(OrderStatus.Expired);
      expect(await activityCount(ds, open, 'CanceledByOperator')).toBe(1);
      const paid = await createOrder(ds, world, {
        status: OrderStatus.WaitingForReview,
        driverId: world.driverIds[0],
      });
      expect(await errorOf(admin().orderService.cancelOrder(paid))).toBe(
        'CANCEL_NOT_ALLOWED',
      );
      expect((await orderRow(ds, paid)).status).toBe(OrderStatus.WaitingForReview);
    });

    it('attribution operateur et acceptation Kasiman simultanees : un seul Kasiman au final, l autre libere', async () => {
      for (let i = 0; i < 10; i++) {
        await ds.query(`UPDATE driver SET status = 'online'`);
        const orderId = await createOrder(ds, world);
        await Promise.allSettled([
          admin().sharedOrder.assignOrderToDriver(orderId, world.driverIds[1]),
          buildDriverApi(ds, redis, d, world.driverIds[0]).update(orderId, {
            status: OrderStatus.DriverAccepted,
          }),
        ]);
        const order = await orderRow(ds, orderId);
        expect(order.status).toBe(OrderStatus.DriverAccepted);
        const other = world.driverIds.find((id) => id !== order.driverId)!;
        expect(await driverStatus(ds, order.driverId!)).toBe(DriverStatus.InService);
        expect(await driverStatus(ds, other)).toBe(DriverStatus.Online);
      }
    });

    it('attribution operateur rejouee : une activite ; refusee sur une course demarree', async () => {
      const orderId = await createOrder(ds, world);
      await admin().sharedOrder.assignOrderToDriver(orderId, world.driverIds[1]);
      await admin().sharedOrder.assignOrderToDriver(orderId, world.driverIds[1]);
      expect(await activityCount(ds, orderId, 'DriverAccepted')).toBe(1);
      const started = await createOrder(ds, world, {
        status: OrderStatus.Started,
        driverId: world.driverIds[0],
      });
      expect(
        await errorOf(admin().sharedOrder.assignOrderToDriver(started, world.driverIds[1])),
      ).toBe('Already Taken');
    });
  });
});
