/**
 * p2-argent I1 (2026-10-19) : regles du coupon (CommonCouponService), contre
 * PostgreSQL reel. docs/fiche-conception-argent.md §1.6 : prix jamais negatif,
 * arrondi au franc ; `allowedServices`, `minimumCost` / `maximumCost`,
 * `isFirstTravelOnly` et `startAt` verifies. Qui finance la remise (§8.6) :
 * hors perimetre.
 *
 *   npm run test:integration -- common-coupon
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildRiderApi,
  buildShared,
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
  World,
} from '../../../../../tools/test-integration/harness';
import { CouponEntity } from '../entities/coupon.entity';
import { CouponRefusal } from './common-coupon.service';

describe('p2-argent I1 : regles du coupon', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  const coupons = () => buildShared(ds, redis, d).commonCoupon;
  /** Coupon applique a une course par le client (updateOneOrder, couponCode). */
  const applyByRider = (orderId: number, code: string) =>
    buildRiderApi(ds, redis, d).update(orderId, world.riderId, { couponCode: code });

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
  });

  it('prix apres coupon : jamais negatif, arrondi au franc', () => {
    const service = coupons();
    const coupon = (discountPercent: number, discountFlat: number) =>
      ({ discountPercent, discountFlat }) as CouponEntity;
    // 15 % de 1 250 = 187,5 : 1 062,5 -> 1 063 (pas de centimes en FCFA).
    expect(service.applyCouponOnPrice(coupon(15, 0), 1250)).toBe(1063);
    // Remise fixe superieure au prix : 0, pas -1 000.
    expect(service.applyCouponOnPrice(coupon(0, 3000), 2000)).toBe(0);
    expect(service.applyCouponOnPrice(coupon(50, 1500), 2000)).toBe(0);
    // Sans coupon : prix inchange.
    expect(service.applyCouponOnPrice(null, 1234.5)).toBe(1234.5);
  });

  it('applique a une course : prix arrondi, et nul plutot que negatif', async () => {
    await createCoupon(ds, { code: 'QUINZE', discountPercent: 15 });
    await createCoupon(ds, { code: 'GROS', discountFlat: 5000 });
    const a = await createOrder(ds, world, { cost: 1250 });
    await applyByRider(a, 'QUINZE');
    expect((await orderRow(ds, a)).costAfterCoupon).toBe(1063);
    const b = await createOrder(ds, world, { cost: 2000 });
    await applyByRider(b, 'GROS');
    expect((await orderRow(ds, b)).costAfterCoupon).toBe(0);
  });

  it('allowedServices : coupon d un autre service refuse ; liste vide = tous les services', async () => {
    const [{ id: mediaId }] = await ds.query(
      `INSERT INTO media (address) VALUES ('autre.png') RETURNING id`,
    );
    const [{ id: otherServiceId }] = await ds.query(
      `INSERT INTO service ("categoryId", title, "mediaId")
       SELECT "categoryId", 'Autre service', $2 FROM service WHERE id = $1
       RETURNING id`,
      [world.serviceId, mediaId],
    );
    await createCoupon(ds, { code: 'AUTRE', discountPercent: 10, serviceIds: [otherServiceId] });
    await createCoupon(ds, { code: 'CELUI', discountPercent: 10, serviceIds: [world.serviceId] });
    await createCoupon(ds, { code: 'TOUS', discountPercent: 10 });
    const a = await createOrder(ds, world);
    expect(await errorOf(applyByRider(a, 'AUTRE'))).toBe(CouponRefusal.ServiceNotAllowed);
    expect((await orderRow(ds, a)).costAfterCoupon).toBe(2000);
    await applyByRider(a, 'CELUI');
    expect((await orderRow(ds, a)).costAfterCoupon).toBe(1800);
    const b = await createOrder(ds, world);
    await applyByRider(b, 'TOUS');
    expect((await orderRow(ds, b)).costAfterCoupon).toBe(1800);
  });

  it('minimumCost / maximumCost : bornes du prix avant coupon, 0 = pas de borne', async () => {
    await createCoupon(ds, { code: 'MIN3000', discountPercent: 10, minimumCost: 3000 });
    await createCoupon(ds, { code: 'MAX1500', discountPercent: 10, maximumCost: 1500 });
    await createCoupon(ds, { code: 'BORNES', discountPercent: 10, minimumCost: 1000, maximumCost: 2500 });
    const orderId = await createOrder(ds, world, { cost: 2000 });
    expect(await errorOf(applyByRider(orderId, 'MIN3000'))).toBe(CouponRefusal.BelowMinimum);
    expect(await errorOf(applyByRider(orderId, 'MAX1500'))).toBe(CouponRefusal.AboveMaximum);
    expect((await orderRow(ds, orderId)).couponId ?? null).toBeNull();
    await applyByRider(orderId, 'BORNES');
    expect((await orderRow(ds, orderId)).costAfterCoupon).toBe(1800);
    // Apercu (getFare) : meme regle, service par service.
    const coupon = await coupons().checkCoupon('MIN3000');
    expect(coupons().refusalForOrder(coupon, world.serviceId, 2000)).toBe(
      CouponRefusal.BelowMinimum,
    );
    expect(coupons().refusalForOrder(coupon, world.serviceId, 3000)).toBeNull();
  });

  it('isFirstTravelOnly : refuse des que le client a termine une course', async () => {
    await createCoupon(ds, { code: 'BIENVENUE', discountPercent: 50, isFirstTravelOnly: true });
    expect((await coupons().checkCoupon('BIENVENUE', world.riderId)).id).toBeGreaterThan(0);
    await createOrder(ds, world, {
      status: OrderStatus.Finished,
      driverId: world.driverIds[0],
    });
    expect(await errorOf(coupons().checkCoupon('BIENVENUE', world.riderId))).toBe(
      CouponRefusal.FirstTravelOnly,
    );
    const orderId = await createOrder(ds, world);
    expect(await errorOf(applyByRider(orderId, 'BIENVENUE'))).toBe(
      CouponRefusal.FirstTravelOnly,
    );
    // Course annulee : ne compte pas comme une course faite.
    const [{ id: newRider }] = await ds.query(
      `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000003, 'Nouveau') RETURNING id`,
    );
    await ds.query(
      `UPDATE request SET "riderId" = $1, status = 'RiderCanceled' WHERE id = $2`,
      [newRider, orderId],
    );
    expect((await coupons().checkCoupon('BIENVENUE', newRider)).code).toBe('BIENVENUE');
  });

  it('startAt : coupon pas encore commence refuse', async () => {
    await createCoupon(ds, { code: 'DEMAIN', discountPercent: 10, startsInDays: 1 });
    expect(await errorOf(coupons().checkCoupon('DEMAIN'))).toBe(CouponRefusal.NotStarted);
    const orderId = await createOrder(ds, world);
    expect(await errorOf(applyByRider(orderId, 'DEMAIN'))).toBe(CouponRefusal.NotStarted);
    expect((await orderRow(ds, orderId)).costAfterCoupon).toBe(2000);
  });
});
