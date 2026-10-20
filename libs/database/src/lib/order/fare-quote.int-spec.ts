/**
 * p2-argent I4 (2026-10-20) : devis fige (`bug-prix`), contre PostgreSQL et
 * Redis reels (docs/fiche-conception-argent.md §5 et §7 « I4 »).
 *
 *   npm run test:integration -- fare-quote
 *
 * Passe par les vrais resolveurs de rider-api (getFare, createOrder) et le
 * vrai FareQuoteService ; seul l'itineraire est simule (d.routing : mapbox,
 * google, osrm ou haversine = estimation a vol d'oiseau).
 *
 * Tarif par defaut : 500 + 50 / 100 m + 10 / min ; itineraire simule de
 * 1 200 m et 180 s, soit 500 + 600 + 30 = 1 130 FCFA.
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { GraphQLError } from 'graphql';

import {
  ALMADIES,
  buildRiderApi,
  concurrently,
  countRows,
  createCoupon,
  createRegion,
  createServiceOption,
  createWorld,
  createZonePrice,
  Doubles,
  integrity,
  ledgerBalance,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  PLATEAU,
  resetDatabase,
  setServicePricing,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { OrderResolver } from '../../../../../apps/rider-api/src/app/order/order.resolver';
import { FareQuoteRefusal, purgeFareQuotes } from './fare-quote.service';
import { kasimanStatement } from './kasiman-statement';

const BASE_PRICE = 1130;

describe('p2-argent I4 : devis fige', () => {
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
    world = await createWorld(ds, { providerSharePercent: 10 });
    await createRegion(ds, [world.serviceId]);
    await setServicePricing(ds, world.serviceId);
  });

  /** Resolveur de rider-api pour le client connecte. */
  function resolver(riderId = world.riderId) {
    const api = buildRiderApi(ds, redis, d);
    return new OrderResolver(
      { req: { user: { id: riderId } } } as never,
      api.sharedOrder,
      api.riderOrderService,
      api.driverRedis,
      api.commonCoupon,
    );
  }

  type FareInput = {
    couponCode?: string;
    selectedOptionIds?: string[];
    intervalMinutes?: number;
  };

  /** getFare, puis le service de test dans la reponse. */
  async function fare(input: FareInput = {}, serviceId = world.serviceId) {
    const result = await resolver().getFare({ points: [PLATEAU, ALMADIES], ...input } as never);
    const all = result.services.flatMap((c) => c.services);
    return all.find((s) => Number(s.id) === serviceId) as unknown as {
      cost: number;
      costAfterCoupon?: number;
      quoteId?: string;
      quoteExpiresAt?: Date;
    };
  }

  type OrderInput = {
    quoteId?: string;
    couponCode?: string;
    optionIds?: string[];
    intervalMinutes?: number;
    points?: Array<{ lat: number; lng: number }>;
  };

  function order(input: OrderInput = {}, serviceId = world.serviceId) {
    return resolver().createOrder({
      serviceId,
      points: input.points ?? [PLATEAU, ALMADIES],
      addresses: ['Plateau', 'Almadies'],
      intervalMinutes: input.intervalMinutes ?? 0,
      optionIds: input.optionIds,
      couponCode: input.couponCode,
      quoteId: input.quoteId,
    } as never);
  }

  async function refusal(promise: Promise<unknown>) {
    try {
      await promise;
      return null;
    } catch (error) {
      return {
        message: (error as Error).message,
        code: (error as GraphQLError).extensions?.['code'] ?? null,
      };
    }
  }

  async function quoteRow(id: string) {
    const [row] = await ds.query(`SELECT * FROM fare_quote WHERE id = $1`, [id]);
    return row;
  }

  // -------------------------------------------------------------------------
  // Prix commande = prix affiche
  // -------------------------------------------------------------------------

  it('prix commande = prix affiche, devis consomme par la course', async () => {
    const shown = await fare();
    expect(shown.cost).toBe(BASE_PRICE);
    expect(shown.quoteId).toBeDefined();
    expect(shown.quoteExpiresAt).toBeInstanceOf(Date);
    // L'itineraire change entre l'apercu et la commande (C4) : sans effet.
    d.routing.use('mapbox', 5000, 900);
    const created = await order({ quoteId: shown.quoteId });
    const row = await orderRow(ds, created.id);
    expect(row.costBest).toBe(BASE_PRICE);
    expect(row.costAfterCoupon).toBe(BASE_PRICE);
    expect(row.distanceBest).toBe(1200);
    expect(row.quoteId).toBe(shown.quoteId);
    const quote = await quoteRow(shown.quoteId!);
    expect(quote.requestId).toBe(created.id);
    expect(quote.consumedAt).not.toBeNull();
    expect(quote.routingSource).toBe('mapbox');
    // Validite de 2 minutes.
    const ttl = (new Date(quote.expiresAt).getTime() - new Date(quote.createdAt).getTime()) / 1000;
    expect(ttl).toBe(120);
  });

  it('options payantes comptees a l apercu comme a la commande (C2)', async () => {
    const optionId = String(await createServiceOption(ds, world.serviceId, 'Paid', 250));
    const shown = await fare({ selectedOptionIds: [optionId] });
    expect(shown.cost).toBe(BASE_PRICE + 250);
    const created = await order({ quoteId: shown.quoteId, optionIds: [optionId] });
    expect((await orderRow(ds, created.id)).costAfterCoupon).toBe(BASE_PRICE + 250);
    expect(await countRows(ds, 'request_options_service_option', '"requestId" = $1', [created.id])).toBe(1);
  });

  it('coupon : prix affiche apres coupon = prix commande, coupon rattache a la course', async () => {
    await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
    const shown = await fare({ couponCode: 'PROMO10' });
    expect(shown.cost).toBe(BASE_PRICE);
    expect(shown.costAfterCoupon).toBe(1017);
    const created = await order({ quoteId: shown.quoteId, couponCode: 'PROMO10' });
    const row = await orderRow(ds, created.id);
    expect(row.costBest).toBe(BASE_PRICE);
    expect(row.costAfterCoupon).toBe(1017);
    expect(row.couponId).not.toBeNull();
  });

  it('forfait de zone : ses multiplicateurs, options ajoutees, prix commande = prix affiche (C3)', async () => {
    const optionId = String(await createServiceOption(ds, world.serviceId, 'Paid', 250));
    await createZonePrice(ds, [world.serviceId], 2000, ['00:00-23:59|1.5']);
    const shown = await fare({ selectedOptionIds: [optionId] });
    expect(shown.cost).toBe(3250);
    const created = await order({ quoteId: shown.quoteId, optionIds: [optionId] });
    expect((await orderRow(ds, created.id)).costAfterCoupon).toBe(3250);
  });

  it('reservation : chiffree a l heure de prise en charge (C5), prix commande = prix affiche', async () => {
    const start = Date.now() + 30 * 60 * 1000;
    const end = Date.now() + 90 * 60 * 1000;
    await setServicePricing(ds, world.serviceId, { dateRangeMultipliers: [`${start}-${end}|2`] });
    expect((await fare()).cost).toBe(BASE_PRICE);
    const booked = await fare({ intervalMinutes: 60 });
    expect(booked.cost).toBe(2 * BASE_PRICE);
    const created = await order({ quoteId: booked.quoteId, intervalMinutes: 60 });
    const row = await orderRow(ds, created.id);
    expect(row.costAfterCoupon).toBe(2 * BASE_PRICE);
    expect(row.status).toBe(OrderStatus.Booked);
  });

  it('total toujours entier au franc, arrondi apres options ; roundingFactor respecte', async () => {
    await setServicePricing(ds, world.serviceId, {
      baseFare: 333.33,
      perHundredMeters: 41.37,
      perMinuteDrive: 7.77,
    });
    const optionId = String(await createServiceOption(ds, world.serviceId, 'Paid', 12.5));
    await createCoupon(ds, { code: 'PROMO15', discountPercent: 15 });
    d.routing.use('osrm', 1234, 77);
    const shown = await fare({ selectedOptionIds: [optionId], couponCode: 'PROMO15' });
    expect(Number.isInteger(shown.cost)).toBe(true);
    expect(Number.isInteger(shown.costAfterCoupon)).toBe(true);
    const created = await order({ quoteId: shown.quoteId, optionIds: [optionId], couponCode: 'PROMO15' });
    const row = await orderRow(ds, created.id);
    expect(row.costBest).toBe(shown.cost);
    expect(row.costAfterCoupon).toBe(shown.costAfterCoupon);
    expect(Number.isInteger(row.costAfterCoupon)).toBe(true);

    await setServicePricing(ds, world.serviceId, {
      baseFare: 333.33,
      perHundredMeters: 41.37,
      perMinuteDrive: 7.77,
      roundingFactor: 25,
    });
    const rounded = await fare({ selectedOptionIds: [optionId] });
    expect(rounded.cost % 25).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Validite
  // -------------------------------------------------------------------------

  it('app qui envoie quoteId : devis expire refuse (QUOTE_EXPIRED), aucune course', async () => {
    const shown = await fare();
    await ds.query(`UPDATE fare_quote SET "expiresAt" = now() - interval '1 second'`);
    expect(await refusal(order({ quoteId: shown.quoteId }))).toEqual({
      message: FareQuoteRefusal.Expired.message,
      code: 'QUOTE_EXPIRED',
    });
    expect(await countRows(ds, 'request')).toBe(0);
    // Identifiant inconnu (devis purge) : meme refus.
    expect((await refusal(order({ quoteId: '00000000-0000-4000-8000-000000000000' })))?.code).toBe(
      'QUOTE_EXPIRED',
    );
  });

  it('app qui envoie quoteId : trajet different refuse (QUOTE_MISMATCH)', async () => {
    const shown = await fare();
    const other = await refusal(
      order({ quoteId: shown.quoteId, points: [PLATEAU, { lat: 14.75, lng: -17.49 }] }),
    );
    expect(other?.code).toBe('QUOTE_MISMATCH');
    expect(await countRows(ds, 'request')).toBe(0);
  });

  it('app installee (sans quoteId) : devis retrouve, coupon compris, jusqu a 10 minutes', async () => {
    await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
    const shown = await fare({ couponCode: 'PROMO10' });
    // Devis vieux de 5 minutes : expire pour une app a jour, honore ici.
    await ds.query(
      `UPDATE fare_quote SET "createdAt" = now() - interval '5 minutes',
         "expiresAt" = now() - interval '3 minutes'`,
    );
    d.routing.use('mapbox', 5000, 900);
    const created = await order(); // ni quoteId ni coupon (C1)
    const row = await orderRow(ds, created.id);
    expect(row.costAfterCoupon).toBe(1017);
    expect(row.costBest).toBe(BASE_PRICE);
    expect(row.couponId).not.toBeNull();
    expect(row.quoteId).toBe(shown.quoteId);
    expect((await quoteRow(shown.quoteId!)).requestId).toBe(created.id);
  });

  it('app installee : au-dela de 10 minutes, devis recalcule a la commande (origine commande)', async () => {
    await createCoupon(ds, { code: 'PROMO10', discountPercent: 10 });
    const shown = await fare({ couponCode: 'PROMO10' });
    await ds.query(`UPDATE fare_quote SET "createdAt" = now() - interval '11 minutes'`);
    const created = await order();
    const row = await orderRow(ds, created.id);
    expect(row.quoteId).not.toBe(shown.quoteId);
    expect(row.costAfterCoupon).toBe(BASE_PRICE);
    expect(row.couponId ?? null).toBeNull();
    const quote = await quoteRow(row.quoteId!);
    expect(quote.origin).toBe('commande');
    expect(quote.requestId).toBe(created.id);
  });

  it('deux createOrder simultanes sur le meme devis = une seule commande', async () => {
    const shown = await fare();
    const results = await concurrently(2, () => order({ quoteId: shown.quoteId }));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((rejected.reason as Error).message).toBe(FareQuoteRefusal.AlreadyUsed.message);
    expect(await countRows(ds, 'request')).toBe(1);
    expect(await countRows(ds, 'fare_quote', '"requestId" IS NOT NULL')).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Itineraire
  // -------------------------------------------------------------------------

  it.each(['mapbox', 'google', 'osrm'] as const)(
    'itineraire %s : vrai calcul routier, devis accorde et trace',
    async (source) => {
      d.routing.use(source);
      const shown = await fare();
      expect(shown.cost).toBe(BASE_PRICE);
      expect((await quoteRow(shown.quoteId!)).routingSource).toBe(source);
    },
  );

  it('itineraire a vol d oiseau (haversine) : devis refuse a l apercu et a la commande', async () => {
    d.routing.use('haversine');
    const shown = await refusal(fare());
    expect(shown).toEqual({
      message: FareQuoteRefusal.RouteUnavailable.message,
      code: 'ROUTE_UNAVAILABLE',
    });
    expect((await refusal(order()))?.code).toBe('ROUTE_UNAVAILABLE');
    expect(await countRows(ds, 'request')).toBe(0);
    expect(await countRows(ds, 'fare_quote')).toBe(0);
  });

  it('forfait de zone : accorde sans itineraire reel (routingSource zone)', async () => {
    await createZonePrice(ds, [world.serviceId], 2000);
    d.routing.use('haversine');
    const shown = await fare();
    expect(shown.cost).toBe(2000);
    expect((await quoteRow(shown.quoteId!)).routingSource).toBe('zone');
    const created = await order({ quoteId: shown.quoteId });
    expect((await orderRow(ds, created.id)).costAfterCoupon).toBe(2000);
    // Sans devis (app installee, devis trop ancien) : accorde aussi a la commande.
    await ds.query(`DELETE FROM fare_quote WHERE "requestId" IS NULL`);
    const legacy = await order();
    expect((await orderRow(ds, legacy.id)).costAfterCoupon).toBe(2000);
  });

  // -------------------------------------------------------------------------
  // Fin de course : Kasi finance le coupon (decision §8.6)
  // -------------------------------------------------------------------------

  it('fin de course avec coupon : Kasiman paye sur le prix avant coupon, remise en KASI:PROMOTIONS', async () => {
    await createZonePrice(ds, [world.serviceId], 2000);
    await createCoupon(ds, { code: 'MOINS500', discountFlat: 500 });
    const shown = await fare({ couponCode: 'MOINS500' });
    expect(shown.costAfterCoupon).toBe(1500);
    const created = await order({ quoteId: shown.quoteId, couponCode: 'MOINS500' });
    const driverId = world.driverIds[0];
    await ds.query(`UPDATE request SET status = $2, "driverId" = $3 WHERE id = $1`, [
      created.id,
      OrderStatus.Started,
      driverId,
    ]);
    const api = buildRiderApi(ds, redis, d);
    const outcome = await api.sharedOrder.finish(created.id, 1500, driverId);
    expect(outcome.paid).toBe(true);
    // Commission 10 % de 2 000 (et non de 1 500) ; remise de 500 creditee.
    expect(await walletBalance(ds, 'driver_wallet', { driverId })).toBe(-200 + 500);
    expect(await ledgerBalance(ds, `KASIMAN:${driverId}`)).toBe(300);
    expect(await ledgerBalance(ds, 'KASI:PRODUITS')).toBe(200);
    expect(await ledgerBalance(ds, 'KASI:PROMOTIONS')).toBe(-500);
    expect(
      await countRows(ds, 'driver_transaction', `"idempotencyKey" = $1 AND amount = 500`, [
        `order:${created.id}:driver-promotion`,
      ]),
    ).toBe(1);
    expect((await integrity(ds)).ok).toBe(true);
    // Rejeu : rien de plus.
    await api.sharedOrder.finish(created.id, 1500, driverId);
    expect(await ledgerBalance(ds, 'KASI:PROMOTIONS')).toBe(-500);
    // Releve : prix de la course pour le Kasiman = 2 000.
    const statement = await kasimanStatement(ds.manager, driverId, 'XOF');
    const line = statement.items.find((i) => i.requestId === created.id)!;
    expect(line.orderPrice).toBe(2000);
    expect(line.onlinePaid).toBe(500);
    expect(line.commission).toBe(-200);
  });

  it('fin de course sans coupon : inchangee (aucune ligne de promotion)', async () => {
    const shown = await fare();
    const created = await order({ quoteId: shown.quoteId });
    const driverId = world.driverIds[0];
    await ds.query(`UPDATE request SET status = $2, "driverId" = $3 WHERE id = $1`, [
      created.id,
      OrderStatus.Started,
      driverId,
    ]);
    await buildRiderApi(ds, redis, d).sharedOrder.finish(created.id, BASE_PRICE, driverId);
    expect(await walletBalance(ds, 'driver_wallet', { driverId })).toBe(-113);
    expect(await ledgerBalance(ds, 'KASI:PROMOTIONS')).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Purge
  // -------------------------------------------------------------------------

  it('purge quotidienne : devis non consommes de plus de 24 h seulement', async () => {
    const shown = await fare();
    await order({ quoteId: shown.quoteId });
    await fare(); // devis frais, non consomme
    await fare();
    await ds.query(
      `UPDATE fare_quote SET "createdAt" = now() - interval '25 hours'
        WHERE id IN (SELECT id FROM fare_quote WHERE "requestId" IS NULL ORDER BY "createdAt" LIMIT 1)
           OR "requestId" IS NOT NULL`,
    );
    expect(await countRows(ds, 'fare_quote')).toBe(3);
    expect(await purgeFareQuotes(ds.manager)).toBe(1);
    expect(await countRows(ds, 'fare_quote')).toBe(2);
    expect(await countRows(ds, 'fare_quote', '"requestId" IS NOT NULL')).toBe(1);
  });
});
