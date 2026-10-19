/**
 * p2-argent I1 (2026-10-19) : carte cadeau (redeemGiftCard de rider-api),
 * contre PostgreSQL reel. Anomalie A8 de docs/fiche-conception-argent.md :
 * mauvais depot, aucune verification de `isUsed`, de la disponibilite ni de
 * l'expiration.
 *
 *   npm run test:integration -- gift-card
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildRiderApi,
  countRows,
  createCoupon,
  createGiftCard,
  createWorld,
  Doubles,
  errorOf,
  makeDoubles,
  openDataSource,
  openRedis,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { GiftCardRefusal } from './coupon.service';

describe('p2-argent I1 : carte cadeau', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let otherRiderId: number;
  const rider = () => buildRiderApi(ds, redis, d);

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
    world = await createWorld(ds, { drivers: 1 });
    [{ id: otherRiderId }] = await ds.query(
      `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000002, 'Autre') RETURNING id`,
    );
  });

  const isUsed = async (cardId: number) =>
    (await ds.query(`SELECT "isUsed" FROM gift_card WHERE id = $1`, [cardId]))[0]
      .isUsed;

  it('carte creditee une fois ; rejeu du meme client sans erreur ni second credit', async () => {
    const cardId = await createGiftCard(ds, { code: 'KDO-5000', amount: 5000 });
    const wallet = await rider().redeemGiftCard('KDO-5000', world.riderId);
    expect(Number(wallet.balance)).toBe(5000);
    expect(await isUsed(cardId)).toBe(true);
    // Rejeu (timeout mobile) : portefeuille renvoye, rien de plus.
    const again = await rider().redeemGiftCard(' KDO-5000 ', world.riderId);
    expect(Number(again.balance)).toBe(5000);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(5000);
    const rows = await ds.query(
      `SELECT "idempotencyKey", "giftCardId", "rechargeType", action FROM rider_transaction`,
    );
    expect(rows).toEqual([
      {
        idempotencyKey: `gift-card:${cardId}`,
        giftCardId: cardId,
        rechargeType: 'Gift',
        action: 'Recharge',
      },
    ]);
  });

  it('carte utilisee par un autre, expiree ou pas encore disponible : refusee, rien d ecrit', async () => {
    await createGiftCard(ds, { code: 'KDO-A' });
    await rider().redeemGiftCard('KDO-A', otherRiderId);
    expect(await errorOf(rider().redeemGiftCard('KDO-A', world.riderId))).toBe(
      GiftCardRefusal.AlreadyUsed,
    );
    const marked = await createGiftCard(ds, { code: 'KDO-B', isUsed: true });
    expect(await errorOf(rider().redeemGiftCard('KDO-B', world.riderId))).toBe(
      GiftCardRefusal.AlreadyUsed,
    );
    const expired = await createGiftCard(ds, { code: 'KDO-C', expiresInDays: -1 });
    expect(await errorOf(rider().redeemGiftCard('KDO-C', world.riderId))).toBe(
      GiftCardRefusal.Expired,
    );
    const future = await createGiftCard(ds, { code: 'KDO-D', availableInDays: 2 });
    expect(await errorOf(rider().redeemGiftCard('KDO-D', world.riderId))).toBe(
      GiftCardRefusal.NotYetAvailable,
    );
    expect(await errorOf(rider().redeemGiftCard('INCONNU', world.riderId))).toBe(
      GiftCardRefusal.InvalidCode,
    );
    expect(await errorOf(rider().redeemGiftCard('  ', world.riderId))).toBe(
      GiftCardRefusal.InvalidCode,
    );
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBeNull();
    expect(await countRows(ds, 'rider_transaction', `"riderId" = $1`, [world.riderId])).toBe(0);
    expect(await isUsed(marked)).toBe(true);
    expect(await isUsed(expired)).toBe(false);
    expect(await isUsed(future)).toBe(false);
  });

  it('deux clients sur la meme carte en meme temps, 15 fois : un seul credit, l autre refuse', async () => {
    for (let i = 0; i < 15; i++) {
      const code = `KDO-SIMUL-${i}`;
      const cardId = await createGiftCard(ds, { code, amount: 1000 });
      const results = await Promise.allSettled([
        rider().redeemGiftCard(code, world.riderId),
        rider().redeemGiftCard(code, otherRiderId),
      ]);
      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(1);
      expect((lost[0].reason as Error).message).toBe(GiftCardRefusal.AlreadyUsed);
      expect(
        await countRows(ds, 'rider_transaction', `"giftCardId" = $1`, [cardId]),
      ).toBe(1);
    }
    const total =
      ((await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })) ?? 0) +
      ((await walletBalance(ds, 'rider_wallet', { riderId: otherRiderId })) ?? 0);
    expect(total).toBe(15 * 1000);
    expect(await countRows(ds, 'rider_transaction')).toBe(15);
  });

  it('code de coupon saisi comme carte cadeau : refuse, coupon intact', async () => {
    const couponId = await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
    expect(await errorOf(rider().redeemGiftCard('PROMO10', world.riderId))).toBe(
      GiftCardRefusal.InvalidCode,
    );
    expect(await countRows(ds, 'rider_transaction')).toBe(0);
    expect(await countRows(ds, 'coupon', 'id = $1 AND "isEnabled"', [couponId])).toBe(1);
  });
});
