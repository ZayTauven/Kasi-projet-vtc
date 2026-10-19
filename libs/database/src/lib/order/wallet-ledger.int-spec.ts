/**
 * p1-unicite : une operation d'argent ne compte qu'une fois
 * (bug-rejeu-portefeuille), contre PostgreSQL reel.
 *
 *   npm run test:integration -- wallet-ledger
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildDriverApi,
  buildRiderApi,
  concurrently,
  countRows,
  createWorld,
  Doubles,
  fakeReply,
  makeDoubles,
  openDataSource,
  openRedis,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import { TransactionStatus } from '../entities/enums/transaction-status.enum';
import { RiderRechargeTransactionType } from '../entities/enums/rider-recharge-transaction-type.enum';
import { ProviderRechargeTransactionType } from '../entities/enums/provider-recharge-transaction-type.enum';
import { MoneyKey } from './wallet-ledger';

describe('p1-unicite : ecritures de portefeuille', () => {
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
    world = await createWorld(ds, { drivers: 2 });
  });

  /** Jeton tel que le dechiffre CryptoService (stub : JSON en clair). */
  const token = (userType: 'client' | 'driver', userId: number, ref: string) =>
    JSON.stringify({
      userType,
      userId,
      status: 'success',
      amount: 5000,
      currency: 'XOF',
      transactionNumber: ref,
      gatewayId: world.gatewayId,
    });

  it('retour de passerelle client (payment_result) rejoue 3 fois puis 5 fois en meme temps : credite une fois', async () => {
    const rider = buildRiderApi(ds, redis, d);
    const call = () =>
      rider.controller.verifyPayment(
        { query: { token: token('client', world.riderId, 'WAVE-123') } } as never,
        fakeReply() as never,
      );
    await call();
    await call();
    await call();
    const results = await concurrently(5, call);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(5000);
    expect(await countRows(ds, 'rider_transaction')).toBe(1);
    const [row] = await ds.query(`SELECT "idempotencyKey" FROM rider_transaction`);
    expect(row.idempotencyKey).toBe(`payment:${world.gatewayId}:WAVE-123`);
  });

  it('retour de passerelle Kasiman rejoue en meme temps : credite une fois', async () => {
    const driver = buildDriverApi(ds, redis, d, world.driverIds[0]);
    const results = await concurrently(6, () =>
      driver.controller.verifyPayment(
        { query: { token: token('driver', world.driverIds[0], 'OM-9') } } as never,
        fakeReply() as never,
      ),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(
      await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] }),
    ).toBe(5000);
    expect(await countRows(ds, 'driver_transaction')).toBe(1);
  });

  it('deux references de passerelle differentes : deux credits', async () => {
    const rider = buildRiderApi(ds, redis, d);
    for (const ref of ['WAVE-1', 'WAVE-2']) {
      await rider.controller.verifyPayment(
        { query: { token: token('client', world.riderId, ref) } } as never,
        fakeReply() as never,
      );
    }
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(
      10000,
    );
  });

  it('credits distincts simultanes sur un portefeuille neuf : un seul portefeuille, aucun credit perdu', async () => {
    const { sharedRider } = buildRiderApi(ds, redis, d);
    const results = await concurrently(20, (i) =>
      sharedRider.rechargeWallet({
        riderId: world.riderId,
        amount: 100,
        currency: 'XOF',
        action: TransactionAction.Recharge,
        rechargeType: RiderRechargeTransactionType.BankTransfer,
        status: TransactionStatus.Done,
        idempotencyKey: `test:distinct:${i}`,
      }),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(2000);
    expect(await countRows(ds, 'rider_transaction')).toBe(20);
  });

  it('meme cle sur le portefeuille du provider (commission) rejouee en meme temps : une ligne', async () => {
    const { sharedProvider } = buildRiderApi(ds, redis, d);
    await concurrently(5, () =>
      sharedProvider.rechargeWallet({
        action: TransactionAction.Recharge,
        rechargeType: ProviderRechargeTransactionType.Commission,
        currency: 'XOF',
        amount: 300,
        idempotencyKey: MoneyKey.order(1, 'provider-commission'),
      }),
    );
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(300);
    expect(await countRows(ds, 'admin_transaction')).toBe(1);
  });

  it('flotte : meme cle rejouee, une seule ligne', async () => {
    const { sharedFleet } = buildRiderApi(ds, redis, d);
    await concurrently(4, () =>
      sharedFleet.rechargeWallet({
        fleetId: world.fleetId,
        action: TransactionAction.Recharge,
        rechargeType: ProviderRechargeTransactionType.Commission,
        currency: 'XOF',
        amount: 20,
        idempotencyKey: MoneyKey.order(1, 'fleet-commission'),
      }),
    );
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(20);
    expect(await countRows(ds, 'fleet_transaction')).toBe(1);
  });
});
