/**
 * p3-mesures M1 et M3 (2026-10-21) : tableau de suivi du pilote
 * (docs/fiche-mesures-pilote.md §3 a §5).
 *
 * Les courses sont produites par la vraie chaine du pilote, comme le banc
 * cycle-pilote.int-spec.ts : devis, commande (rider-api), vagues
 * (DispatchWaveService, DISPATCH_MODE=waves), refus, acceptation,
 * transitions et paiement (driver-api), annulations client, Kasiman et
 * operateur, « aucun Kasiman » et demande non servie, livraisons Kasi Moto,
 * reservation, avis (rider-api), reglements de dette (admin-api), grand livre
 * en mode strict.
 *
 * Trois lots : une semaine avant la periode (retention et « nouveaux » de la
 * 1re semaine), puis deux semaines de pilote. Le banc ne peut pas attendre
 * quinze jours : chaque lot, une fois joue, est replace dans sa semaine en
 * decalant ses horodatages (course, activites, sollicitations, demande non
 * servie, avis, ecritures du grand livre ; leurs declencheurs d'immuabilite
 * sont suspendus le temps de l'UPDATE, puis verifies actifs a la fin). Le
 * delai d'attribution de chaque course est fixe a ce moment (tire par la
 * graine) : `DriverAccepted` = commande + delai.
 *
 * Chaque indicateur est compare a un calcul attendu tenu a cote, a partir de
 * ce que le test a fait (qui a gagne, paye, annule, note, regle), sauf les
 * sollicitations (3b) relues brutes dans dispatch_attempt et seulement
 * agregees ici. Droits : Requests_View, ProviderWallet_View.
 *
 * Limite : aucune app n'envoie encore de motif d'annulation
 * (`request.cancelReasonId` n'est ecrit par aucune API) ; le test le pose en
 * SQL, comme le ferait l'app.
 *
 *   npm run test:integration -- pilot-insights
 */
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { printSchema } from 'graphql';

import {
  ALMADIES,
  buildAdminApi,
  buildDispatchWaves,
  buildDriverApi,
  buildRiderApi,
  createOperator,
  createRegion,
  createWorld,
  CURRENCY,
  Doubles,
  errorOf,
  integrity,
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
import { DriverDeductTransactionType } from '../../../../../libs/database/src/lib/entities/enums/driver-deduct-transaction-type.enum';
import { RiderRechargeTransactionType } from '../../../../../libs/database/src/lib/entities/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '../../../../../libs/database/src/lib/entities/enums/transaction-action.enum';
import { LedgerAccounts, postManualOperation } from '../../../../../libs/database/src/lib/order/ledger';
import { OrderResolver as RiderOrderResolver } from '../../../../rider-api/src/app/order/order.resolver';
import { DispatchWaveService } from '../../../../driver-api/src/app/dispatch/dispatch-wave.service';
import { PilotInsightsResolver } from './pilot-insights.resolver';
import { PilotInsightsService } from './pilot-insights.service';

const SEED = Number(process.env.KASI_PILOT_SEED ?? 20261021);
const DAY = 86_400_000;
const WEEK = 7 * DAY;
const HOUR = 3_600_000;
const KM_LAT = 0.008993;
const COMMISSION = 0.1;
const FEE_TOTAL = 500;
const FEE_DRIVER = 300;
const DEBT_LIMIT = 10_000;
const DEBTOR_DEBT = -12_000;
const WALLET_START = 100_000;

/** Seuils de la fiche §6 (valides le 2026-10-21), ecrits ici sans passer par le code. */
const THRESHOLDS = {
  assignmentMedianMaxSeconds: 180,
  serviceRateMin: 0.85,
  kasimanRetentionMin: 0.7,
  cashRecoveryMin: 0.9,
  recurringClientsMin: 0.3,
  breakEvenMonthlyOrders: 5000,
};

function seeded(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)) };
}

/** Lundi 00:00 UTC, calcule ici independamment du code teste. */
function monday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const back = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  return new Date(d.getTime() - back * DAY);
}

type Scenario =
  | 'cash'
  | 'wallet'
  | 'delivery'
  | 'refusal'
  | 'booked'
  | 'riderCancelBefore'
  | 'riderCancelAfter'
  | 'driverCancel'
  | 'operatorCancel'
  | 'noKasiman';
type Family = 'people' | 'parcels';
type Status = 'completed' | 'riderBefore' | 'riderAfter' | 'driver' | 'expired' | 'operator';

interface Spec {
  s: Scenario;
  rider: number;
  reason?: 'wait' | 'plans' | 'unreachable';
  score?: number;
  near?: number[];
}

interface Course {
  id: number;
  ts: Date;
  family: Family;
  scenario: Scenario;
  riderId: number;
  driverId: number | null;
  status: Status;
  accepted: boolean;
  booked: boolean;
  delaySec: number | null;
  reasonId: number | null;
  cost: number;
  cash: boolean;
  score: number | null;
  unserved: boolean;
  alert: boolean;
  attempts: Array<{ outcome: string; wave: number }>;
}

describe('p3-mesures : tableau de suivi du pilote sur deux semaines de courses', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let queue: RecordingQueue;
  let waves: DispatchWaveService;
  let deliveryServiceId: number;
  let walletRider: number;
  let riders: number[];
  let drivers: number[];
  let debtor: number;
  let moneyOperator: number;
  const reasons: Record<string, { id: number; title: string; userType: string }> = {};
  const courses: Course[] = [];
  /** Mouvements des comptes KASIMAN (attendus) : solde a une date = somme avant. */
  const balanceEvents: Array<{ driverId: number; at: Date; amount: number }> = [];
  const settlements: Array<{ at: Date; amount: number }> = [];
  const savedMode = process.env.DISPATCH_MODE;
  const rand = seeded(SEED);

  const W_A = new Date(monday(new Date()).getTime() - 2 * WEEK);
  const W_B = new Date(W_A.getTime() + WEEK);
  const W_0 = new Date(W_A.getTime() - WEEK);
  const PERIOD = { from: W_A, to: new Date(W_B.getTime() + WEEK) };
  /** Periode decalee : commence et finit au milieu d'une semaine. */
  const PARTIAL = { from: new Date(W_A.getTime() + 84 * HOUR), to: new Date(W_B.getTime() + 100 * HOUR) };

  const resolverFor = async (permissions: string[]) =>
    new PilotInsightsResolver(new PilotInsightsService(ds), ds, {
      req: { user: { id: await createOperator(ds, permissions) } },
    } as never);

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
    await resetDatabase(ds, redis);
    process.env.DISPATCH_MODE = 'waves';
    d = makeDoubles();
    world = await createWorld(ds, {
      drivers: 6,
      providerSharePercent: COMMISSION * 100,
      cancellationTotalFee: FEE_TOTAL,
      cancellationDriverShare: FEE_DRIVER,
    });
    drivers = world.driverIds.slice(0, 5);
    debtor = world.driverIds[5];
    await ds.query(`UPDATE service SET "searchRadius" = 5000 WHERE id = $1`, [world.serviceId]);
    await createRegion(ds, [world.serviceId]);
    await setServicePricing(ds, world.serviceId);
    // Kasi Moto (colis), meme flotte : les Kasimen livrent tous (grand colis).
    const [{ id }] = await ds.query(
      `WITH m AS (INSERT INTO media (address) VALUES ('livraison.png') RETURNING id)
       INSERT INTO service ("categoryId", title, "mediaId", "cancellationTotalFee", "cancellationDriverShare",
         "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait", "orderType", "searchRadius")
       SELECT "categoryId", 'Kasi Moto', (SELECT id FROM m), "cancellationTotalFee", "cancellationDriverShare",
         "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait", 'Delivery', 5000
         FROM service WHERE id = $1 RETURNING id`,
      [world.serviceId],
    );
    deliveryServiceId = id;
    await setServicePricing(ds, deliveryServiceId);
    await ds.query(`INSERT INTO service_regions_region ("serviceId", "regionId") SELECT $1, id FROM region`, [
      deliveryServiceId,
    ]);
    for (const driverId of world.driverIds) {
      await ds.query(
        `INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [driverId, deliveryServiceId],
      );
      await ds.query(`UPDATE driver SET "canDeliver" = true, "maxPackageSize" = 'Large' WHERE id = $1`, [driverId]);
    }
    await ds.query(
      `INSERT INTO money_policy (currency, "debtLimit", "debtAlertThreshold") VALUES ($1, $2, 7500)`,
      [CURRENCY, DEBT_LIMIT],
    );
    for (const [key, title, userType] of [
      ['wait', 'Attente trop longue', 'Rider'],
      ['plans', 'Changement de programme', 'Rider'],
      ['unreachable', 'Client injoignable', 'Driver'],
    ]) {
      const [row] = await ds.query(
        `INSERT INTO order_cancel_reason (title, "userType") VALUES ($1, $2) RETURNING id`,
        [title, userType],
      );
      reasons[key] = { id: row.id, title, userType };
    }

    // Clients : 5 en especes, 1 par portefeuille. Kasiman endette au-dela du plafond.
    riders = [world.riderId];
    for (let i = 2; i <= 5; i++) {
      const [row] = await ds.query(
        `INSERT INTO rider ("mobileNumber", "firstName") VALUES ($1, $2) RETURNING id`,
        [221770000000 + i, `Client ${i}`],
      );
      riders.push(row.id);
    }
    const [wallet] = await ds.query(
      `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000009, 'Client portefeuille') RETURNING id`,
    );
    walletRider = wallet.id;
    moneyOperator = await createOperator(ds, ['DriverWallet_Edit', 'RiderWallet_Edit']);
    await buildAdminApi(ds, redis, d, moneyOperator).riderResolver.createRiderTransaction({
      riderId: walletRider,
      action: TransactionAction.Recharge,
      rechargeType: RiderRechargeTransactionType.Correction,
      amount: WALLET_START,
      currency: CURRENCY,
    } as never);
    await postManualOperation(ds.manager, {
      account: LedgerAccounts.kasiman(debtor),
      amount: DEBTOR_DEBT,
      currency: CURRENCY,
      operatorId: moneyOperator,
      motif: 'Banc mesures : dette au-dela du plafond',
      walletFields: { action: TransactionAction.Deduct, deductType: DriverDeductTransactionType.Correction },
    });
    const setupAt = new Date(W_0.getTime() - 12 * HOUR);
    await ledgerUpdate(`UPDATE ledger_entry SET "createdAt" = ($1::timestamptz AT TIME ZONE 'UTC')`, [
      setupAt.toISOString(),
    ]);
    balanceEvents.push({ driverId: debtor, at: setupAt, amount: DEBTOR_DEBT });

    queue = new RecordingQueue();
    waves = buildDispatchWaves(ds, redis, d, queue).waves;

    // Semaine 0 (avant la periode) : Kasimen 1 et 4, clients 1 et 2.
    await runBatch(W_0, [
      { s: 'cash', rider: 0, near: [0] },
      { s: 'cash', rider: 1, near: [3] },
    ]);
    // Semaine A : Kasimen 1 a 4 dans le rayon.
    await runBatch(W_A, [
      { s: 'cash', rider: 0, score: 100 },
      { s: 'riderCancelBefore', rider: 1, reason: 'wait' },
      { s: 'cash', rider: 2, score: 80 },
      { s: 'noKasiman', rider: 3 },
      { s: 'delivery', rider: 0, score: 60 },
      { s: 'refusal', rider: 1 },
      { s: 'noKasiman', rider: 2 },
      { s: 'wallet', rider: 0, score: 40 },
      { s: 'riderCancelAfter', rider: 2, reason: 'plans' },
      { s: 'noKasiman', rider: 0 },
      { s: 'cash', rider: 3 },
      { s: 'driverCancel', rider: 1, reason: 'unreachable' },
      { s: 'riderCancelBefore', rider: 3 },
      { s: 'delivery', rider: 2, score: 100 },
      { s: 'cash', rider: 1 },
      { s: 'cash', rider: 0 },
    ]);
    // Reglements de la semaine A : toute la dette du plus endette, la moitie d'un autre.
    const debtsA = debtsNow().filter(([id]) => id !== debtor);
    await settle(debtsA[0][0], debtsA[0][1], new Date(W_A.getTime() + 150 * HOUR));
    if (debtsA.length > 1) {
      await settle(debtsA[1][0], Math.floor(debtsA[1][1] / 2), new Date(W_A.getTime() + 151 * HOUR));
    }
    // Semaine B : Kasimen 2 a 5 dans le rayon.
    await runBatch(W_B, [
      { s: 'cash', rider: 1, score: 100 },
      { s: 'delivery', rider: 4, score: 20 },
      { s: 'booked', rider: 2 },
      { s: 'riderCancelBefore', rider: 3, reason: 'wait' },
      { s: 'cash', rider: 4, score: 80 },
      { s: 'operatorCancel', rider: 1 },
      { s: 'wallet', rider: 0, score: 100 },
      { s: 'refusal', rider: 2 },
      { s: 'noKasiman', rider: 4 },
      { s: 'driverCancel', rider: 3, reason: 'unreachable' },
      { s: 'cash', rider: 1 },
      { s: 'riderCancelAfter', rider: 4, reason: 'wait' },
      { s: 'delivery', rider: 2 },
      { s: 'cash', rider: 3 },
      { s: 'cash', rider: 4 },
    ]);
    // Reglements de la semaine B : 3 000 du Kasiman bloque (il reste au-dela
    // du plafond... puis non : 9 000 < 10 000), et toute la dette d'un autre.
    await settle(debtor, 3000, new Date(W_B.getTime() + 150 * HOUR));
    const debtsB = debtsNow().filter(([id]) => id !== debtor);
    if (debtsB.length > 0) await settle(debtsB[0][0], debtsB[0][1], new Date(W_B.getTime() + 151 * HOUR));

    // Sollicitations brutes (3b), relues une fois tout clos.
    const attempts: Array<{ requestId: number; outcome: string; wave: number }> = await ds.query(
      `SELECT "requestId", outcome, wave FROM dispatch_attempt ORDER BY id`,
    );
    for (const c of courses) {
      c.attempts = attempts.filter((a) => Number(a.requestId) === c.id).map(({ outcome, wave }) => ({ outcome, wave }));
      // Coherence du journal avec ce que le test a fait.
      expect({ id: c.id, accepted: c.attempts.filter((a) => a.outcome === 'accepted').length }).toEqual({
        id: c.id,
        accepted: c.accepted ? 1 : 0,
      });
      expect({ id: c.id, rejected: c.attempts.filter((a) => a.outcome === 'rejected').length }).toEqual({
        id: c.id,
        rejected: c.scenario === 'refusal' ? 1 : 0,
      });
    }
  }, 600_000);

  afterAll(async () => {
    if (savedMode == null) delete process.env.DISPATCH_MODE;
    else process.env.DISPATCH_MODE = savedMode;
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  /** UPDATE du grand livre, declencheur d'immuabilite suspendu dans la transaction. */
  async function ledgerUpdate(sql: string, params: unknown[]) {
    await ds.transaction(async (m) => {
      await m.query(`ALTER TABLE "ledger_entry" DISABLE TRIGGER "ledger_entry_immutable"`);
      await m.query(sql, params);
      await m.query(`ALTER TABLE "ledger_entry" ENABLE TRIGGER "ledger_entry_immutable"`);
    });
  }

  function balancesAt(end: Date): Map<number, number> {
    const result = new Map<number, number>();
    for (const e of balanceEvents) {
      if (e.at < end) result.set(e.driverId, (result.get(e.driverId) ?? 0) + e.amount);
    }
    return result;
  }

  /** Dettes du moment (attendues), de la plus forte a la plus faible. */
  function debtsNow(): Array<[number, number]> {
    return [...balancesAt(new Date(8.64e15))]
      .filter(([, b]) => b < 0)
      .map(([id, b]): [number, number] => [id, -b])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  }

  async function settle(driverId: number, amount: number, at: Date) {
    const [{ max }] = await ds.query(`SELECT COALESCE(max(id), 0)::int AS max FROM ledger_entry`);
    await buildAdminApi(ds, redis, d, moneyOperator).driverResolver.settleDriverDebt({
      driverId,
      amount,
      currency: CURRENCY,
      receiptNumber: `R-${driverId}-${at.getTime()}`,
      motif: 'Banc mesures : especes deposees',
      idempotencyKey: `banc-mesures-${driverId}-${at.getTime()}`,
    } as never);
    await ledgerUpdate(`UPDATE ledger_entry SET "createdAt" = ($2::timestamptz AT TIME ZONE 'UTC') WHERE id > $1`, [
      max,
      at.toISOString(),
    ]);
    balanceEvents.push({ driverId, at, amount });
    settlements.push({ at, amount });
  }

  const done = new Set<string>();
  async function runJobsUntil(orderId: number, until: () => Promise<boolean>) {
    while (!(await until())) {
      const job = queue.jobs.find((j) => j.data.orderId === orderId && !done.has(String(j.opts.jobId)));
      if (job == null) return;
      done.add(String(job.opts.jobId));
      if (job.name === 'wave') await waves.runWave({ orderId, wave: job.data.wave });
      else await waves.expire({ orderId });
    }
  }
  const pending = async (orderId: number): Promise<number[]> =>
    (
      await ds.query(`SELECT "driverId" FROM dispatch_attempt WHERE "requestId" = $1 AND outcome = 'pending' ORDER BY wave, rank`, [
        orderId,
      ])
    ).map((r: { driverId: number }) => Number(r.driverId));
  const statusOf = async (orderId: number) => (await orderRow(ds, orderId)).status;
  const driver = (driverId: number) => buildDriverApi(ds, redis, d, driverId);
  const riderApi = () => buildRiderApi(ds, redis, d);
  const riderResolver = (riderId: number) => {
    const api = buildRiderApi(ds, redis, d);
    return new RiderOrderResolver(
      { req: { user: { id: riderId } } } as never,
      api.sharedOrder,
      api.riderOrderService,
      api.driverRedis,
      api.commonCoupon,
    );
  };
  const cancelUpdate = { status: OrderStatus.RiderCanceled, waitMinutes: 0, tipAmount: 0 };

  /** Joue une course de bout en bout ; renvoie ce que le test sait d'elle. */
  async function runCourse(spec: Spec, near: number[], ts: Date, noKasimanSoFar: number): Promise<Course> {
    const far = spec.s === 'noKasiman';
    for (const [i, driverId] of world.driverIds.entries()) {
      const close = !far && near.includes(i);
      const km = close ? rand.int(2, 28) / 10 : 15;
      await driver(driverId).driverRedis.setLocation(driverId, { lat: PLATEAU.lat + km * KM_LAT, lng: PLATEAU.lng });
    }
    d.routing.use('mapbox', rand.int(8, 60) * 100, rand.int(2, 25) * 60);
    const delivery = spec.s === 'delivery';
    const serviceId = delivery ? deliveryServiceId : world.serviceId;
    const riderId = spec.s === 'wallet' ? walletRider : riders[spec.rider];
    const intervalMinutes = spec.s === 'booked' ? 60 : 0;
    const fare = await riderResolver(riderId).getFare({ points: [PLATEAU, ALMADIES], intervalMinutes } as never);
    const shown = fare.services
      .flatMap((c) => c.services)
      .find((s) => Number(s.id) === serviceId) as unknown as { cost: number; quoteId?: string };
    const orderId = Number(
      (
        await riderResolver(riderId).createOrder({
          serviceId,
          points: [PLATEAU, ALMADIES],
          addresses: ['Plateau', 'Almadies'],
          intervalMinutes,
          quoteId: shown.quoteId,
          ...(delivery
            ? { packageSize: 'Medium', recipientName: 'Destinataire', recipientMobileNumber: '221770000099' }
            : {}),
        } as never)
      ).id,
    );
    if (spec.s === 'booked') expect(await statusOf(orderId)).toBe(OrderStatus.Booked);
    const course: Course = {
      id: orderId,
      ts,
      family: delivery ? 'parcels' : 'people',
      scenario: spec.s,
      riderId,
      driverId: null,
      status: 'completed',
      accepted: false,
      booked: spec.s === 'booked',
      delaySec: null,
      reasonId: spec.reason == null ? null : reasons[spec.reason].id,
      cost: shown.cost,
      cash: spec.s !== 'wallet',
      score: null,
      unserved: false,
      alert: false,
      attempts: [],
    };
    done.add(`wave-${orderId}-1`);
    await waves.runWave({ orderId, wave: 1 });
    const expired = async () => (await statusOf(orderId)) === OrderStatus.Expired;
    const asked = async () => (await pending(orderId)).length > 0;

    if (far) {
      await runJobsUntil(orderId, expired);
      expect(await statusOf(orderId)).toBe(OrderStatus.Expired);
      // Regle D6 : 3 demandes non servies a 1 km en 15 min = une alerte, puis
      // une heure de silence (le lot dure quelques minutes).
      return { ...course, status: 'expired', unserved: true, alert: noKasimanSoFar + 1 === 3 };
    }
    await runJobsUntil(orderId, async () => (await asked()) || (await expired()));
    expect({ orderId, asked: await asked() }).toEqual({ orderId, asked: true });

    if (spec.s === 'riderCancelBefore') {
      await riderApi().update(orderId, riderId, cancelUpdate);
      await runJobsUntil(orderId, async () => false);
      expect(await statusOf(orderId)).toBe(OrderStatus.RiderCanceled);
      return { ...course, status: 'riderBefore' };
    }
    if (spec.s === 'operatorCancel') {
      await buildAdminApi(ds, redis, d, moneyOperator).orderService.cancelOrder(orderId);
      await runJobsUntil(orderId, async () => false);
      expect(await statusOf(orderId)).toBe(OrderStatus.Expired);
      return { ...course, status: 'operator' };
    }
    if (spec.s === 'refusal') {
      expect(await waves.reject(orderId, (await pending(orderId))[0])).toBe(true);
      await runJobsUntil(orderId, async () => (await asked()) || (await expired()));
      expect({ orderId, asked: await asked() }).toEqual({ orderId, asked: true });
    }
    const candidates = await pending(orderId);
    const winner = candidates[rand.int(0, candidates.length - 1)];
    await driver(winner).update(orderId, { status: OrderStatus.DriverAccepted });
    await runJobsUntil(orderId, async () => false);
    expect(await statusOf(orderId)).toBe(OrderStatus.DriverAccepted);
    const accepted = {
      ...course,
      driverId: winner,
      accepted: true,
      delaySec: course.booked ? 3000 : rand.int(20, 400),
    };
    const commission = Math.round(course.cost * COMMISSION);

    if (spec.s === 'riderCancelAfter') {
      await riderApi().update(orderId, riderId, cancelUpdate);
      expect(await statusOf(orderId)).toBe(OrderStatus.RiderCanceled);
      balanceEvents.push({ driverId: winner, at: ts, amount: FEE_DRIVER });
      return { ...accepted, status: 'riderAfter' };
    }
    if (spec.s === 'driverCancel') {
      await driver(winner).update(orderId, { status: OrderStatus.DriverCanceled });
      expect(await statusOf(orderId)).toBe(OrderStatus.DriverCanceled);
      return { ...accepted, status: 'driver' };
    }
    await driver(winner).update(orderId, { status: OrderStatus.Arrived });
    await driver(winner).update(orderId, { status: OrderStatus.Started });
    await driver(winner).update(orderId, { status: OrderStatus.Finished });
    if (spec.s === 'wallet') {
      balanceEvents.push({ driverId: winner, at: ts, amount: course.cost - commission });
    } else {
      expect(await statusOf(orderId)).toBe(OrderStatus.WaitingForPostPay);
      await driver(winner).update(orderId, { status: OrderStatus.Finished, paidAmount: course.cost });
      balanceEvents.push({ driverId: winner, at: ts, amount: -commission });
    }
    expect(await statusOf(orderId)).toBe(OrderStatus.WaitingForReview);
    if (spec.score != null) {
      await riderApi().riderOrderService.submitReview(riderId, {
        requestId: orderId,
        score: spec.score,
        parameterIds: [],
      } as never);
      expect(await statusOf(orderId)).toBe(OrderStatus.Finished);
    }
    return { ...accepted, score: spec.score ?? null };
  }

  /** Joue un lot de courses, puis le replace dans la semaine `week` (une course toutes les 9 h). */
  async function runBatch(week: Date, specs: Spec[]) {
    const batch: Course[] = [];
    let noKasiman = 0;
    for (const [i, spec] of specs.entries()) {
      const near = spec.near ?? (week === W_A ? [0, 1, 2, 3] : [1, 2, 3, 4]);
      const ts = new Date(week.getTime() + (6 + 9 * i) * HOUR);
      const course = await runCourse(spec, near, ts, noKasiman);
      if (spec.s === 'noKasiman') noKasiman++;
      if (course.reasonId != null) {
        await ds.query(`UPDATE request SET "cancelReasonId" = $2 WHERE id = $1`, [course.id, course.reasonId]);
      }
      batch.push(course);
    }
    // Replacement dans le temps (le lot entier, apres coup : la regle d'alerte
    // de la demande non servie lit les horodatages reels pendant le lot).
    const iv = `make_interval(secs => $2::double precision)`;
    for (const c of batch) {
      const [{ shift }] = await ds.query(
        `SELECT EXTRACT(EPOCH FROM (($2::timestamptz AT TIME ZONE 'UTC') - "requestTimestamp"))::float8 AS shift
           FROM request WHERE id = $1`,
        [c.id, c.ts.toISOString()],
      );
      const p = [c.id, shift];
      await ds.query(
        `UPDATE request SET "requestTimestamp" = "requestTimestamp" + ${iv},
           "startTimestamp" = "startTimestamp" + ${iv}, "finishTimestamp" = "finishTimestamp" + ${iv},
           "expectedTimestamp" = "expectedTimestamp" + ${iv} WHERE id = $1`,
        p,
      );
      await ds.query(`UPDATE request_activity SET "createdAt" = "createdAt" + ${iv} WHERE "requestId" = $1`, p);
      await ds.query(
        `UPDATE dispatch_attempt SET "offeredAt" = "offeredAt" + ${iv}, "respondedAt" = "respondedAt" + ${iv}
          WHERE "requestId" = $1`,
        p,
      );
      await ds.query(
        `UPDATE unserved_demand SET "createdAt" = "createdAt" + ${iv}, "alertedAt" = "alertedAt" + ${iv}
          WHERE "requestId" = $1`,
        p,
      );
      await ds.query(`UPDATE request_review SET "reviewTimestamp" = "reviewTimestamp" + ${iv} WHERE "requestId" = $1`, p);
      await ledgerUpdate(`UPDATE ledger_entry SET "createdAt" = "createdAt" + ${iv} WHERE "requestId" = $1`, p);
      if (c.delaySec != null) {
        await ds.query(
          `UPDATE request_activity a SET "createdAt" = r."requestTimestamp" + make_interval(secs => $2::double precision)
             FROM request r WHERE r.id = a."requestId" AND a."requestId" = $1 AND a.type = 'DriverAccepted'`,
          [c.id, c.delaySec],
        );
      }
    }
    // Demande non servie et alerte : ce que dit la regle, verifie sur la table.
    const alerted: Array<{ requestId: number }> = await ds.query(
      `SELECT "requestId" FROM unserved_demand WHERE "alertedAt" IS NOT NULL AND "requestId" = ANY($1::int[])`,
      [batch.map((c) => c.id)],
    );
    expect(alerted.map((r) => Number(r.requestId)).sort()).toEqual(batch.filter((c) => c.alert).map((c) => c.id));
    courses.push(...batch);
  }

  // -------------------------------------------------------------------------
  // Calcul attendu (definitions de la fiche §3, ecrites a nouveau)
  // -------------------------------------------------------------------------

  type Slice = { weekStart: Date | null; start: Date; end: Date };

  function slicesOf(from: Date, to: Date): Slice[] {
    const out: Slice[] = [];
    for (let w = monday(from); w < to; w = new Date(w.getTime() + WEEK)) {
      out.push({
        weekStart: w,
        start: new Date(Math.max(w.getTime(), from.getTime())),
        end: new Date(Math.min(w.getTime() + WEEK, to.getTime())),
      });
    }
    out.push({ weekStart: null, start: from, end: to });
    return out;
  }

  function percentile(values: number[], p: number): number | null {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const pos = p * (s.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }

  const rate = (a: number, b: number) => (b > 0 ? a / b : null);

  function expectedDashboard(from: Date, to: Date, withMoney: boolean, now: Date) {
    const slices = slicesOf(from, to);
    const weekSlices = slices.filter((s) => s.weekStart != null);
    const fams: Array<'all' | Family> = ['all', 'people', 'parcels'];
    const ofFam = (fam: 'all' | Family) => (c: Course) => fam === 'all' || c.family === fam;
    const between = (a: Date, b: Date) => (c: Course) => c.ts >= a && c.ts < b;
    const completedIn = (fam: 'all' | Family, a: Date, b: Date) =>
      courses.filter((c) => ofFam(fam)(c) && between(a, b)(c) && c.status === 'completed');
    const firstCompleted = (fam: 'all' | Family, key: 'driverId' | 'riderId', id: number) =>
      Math.min(
        ...courses.filter((c) => ofFam(fam)(c) && c.status === 'completed' && c[key] === id).map((c) => c.ts.getTime()),
      );

    function kasimenWeek(fam: 'all' | Family, s: Slice) {
      const active = new Set(completedIn(fam, s.start, s.end).map((c) => c.driverId!));
      const before = new Set(
        completedIn(fam, new Date(s.weekStart!.getTime() - WEEK), s.weekStart!).map((c) => c.driverId!),
      );
      return { active, before, retained: [...active].filter((id) => before.has(id)).length };
    }

    function indicators(s: Slice, fam: 'all' | Family) {
      const cs = courses.filter((c) => ofFam(fam)(c) && between(s.start, s.end)(c));
      const n = (st: Status) => cs.filter((c) => c.status === st).length;
      const ordered = cs.length;
      const riderBefore = n('riderBefore');
      const assigned = cs.filter((c) => c.accepted).length;
      const delays = cs.filter((c) => c.accepted && !c.booked).map((c) => c.delaySec!);
      const attempts = cs.flatMap((c) => c.attempts);
      const outcome = (o: string) => attempts.filter((a) => a.outcome === o).length;
      const acceptedWaves = attempts.filter((a) => a.outcome === 'accepted').map((a) => a.wave);
      const answered = outcome('accepted') + outcome('rejected') + outcome('no_answer') + outcome('expired');
      const reasonCount = new Map<number, number>();
      for (const c of cs) {
        if (c.reasonId != null && ['riderBefore', 'riderAfter', 'driver'].includes(c.status)) {
          reasonCount.set(c.reasonId, (reasonCount.get(c.reasonId) ?? 0) + 1);
        }
      }
      const topReasons = [...reasonCount]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, 5)
        .map(([id, count]) => {
          const r = Object.values(reasons).find((x) => x.id === id)!;
          return { reasonId: id, title: r.title, userType: r.userType, canceledBy: null, count };
        });
      const days = (Math.min(s.end.getTime(), now.getTime()) - s.start.getTime()) / DAY;

      // 6
      let kasimen;
      if (s.weekStart != null) {
        const { active, before, retained } = kasimenWeek(fam, s);
        kasimen = {
          active: active.size,
          new: [...active].filter((id) => {
            const first = firstCompleted(fam, 'driverId', id);
            return first >= s.start.getTime() && first < s.end.getTime();
          }).length,
          retained,
          retentionBase: before.size,
          retentionRate: rate(retained, before.size),
        };
      } else {
        const active = new Set(completedIn(fam, from, to).map((c) => c.driverId!));
        const weeks = weekSlices.map((w) => kasimenWeek(fam, w));
        const retained = weeks.reduce((t, w) => t + w.retained, 0);
        const base = weeks.reduce((t, w) => t + w.before.size, 0);
        kasimen = {
          active: active.size,
          new: [...active].filter((id) => {
            const first = firstCompleted(fam, 'driverId', id);
            return first >= from.getTime() && first < to.getTime();
          }).length,
          retained,
          retentionBase: base,
          retentionRate: rate(retained, base),
        };
      }

      // 7
      const perRider = new Map<number, number>();
      for (const c of completedIn(fam, s.start, s.end)) perRider.set(c.riderId, (perRider.get(c.riderId) ?? 0) + 1);
      const recurring = [...perRider.values()].filter((x) => x >= 2).length;
      const clients = {
        active: perRider.size,
        recurring,
        new: [...perRider.keys()].filter((id) => {
          const first = firstCompleted(fam, 'riderId', id);
          return first >= s.start.getTime() && first < s.end.getTime();
        }).length,
        recurringRate: rate(recurring, perRider.size),
      };

      // 8
      const unserved = cs.filter((c) => c.unserved);
      const alerts = unserved.filter((c) => c.alert).length;

      // 9
      const scores = cs.filter((c) => c.score != null).map((c) => c.score!);

      // 5
      let money = null;
      if (withMoney && fam === 'all') {
        const due = cs
          .filter((c) => c.status === 'completed' && c.cash)
          .reduce((t, c) => t + Math.round(c.cost * COMMISSION), 0);
        const recovered = settlements.filter((x) => x.at >= s.start && x.at < s.end).reduce((t, x) => t + x.amount, 0);
        const balances = [...balancesAt(s.end).values()];
        money = {
          commissionDue: due,
          commissionRecovered: recovered,
          recoveryRate: rate(recovered, due),
          outstandingDebt: balances.reduce((t, b) => t + Math.max(0, -b), 0),
          blockedKasimen: balances.filter((b) => -b > DEBT_LIMIT).length,
        };
      }

      return {
        orders: {
          ordered,
          completed: n('completed'),
          riderCanceledBeforeAssignment: riderBefore,
          riderCanceledAfterAssignment: n('riderAfter'),
          driverCanceled: n('driver'),
          expired: n('expired'),
          operatorCanceled: n('operator'),
          monthlyProjection: days > 0 ? (n('completed') * 30) / days : null,
        },
        assignment: {
          assigned: delays.length,
          medianSeconds: percentile(delays, 0.5),
          p90Seconds: percentile(delays, 0.9),
        },
        service: { assigned, eligible: ordered - riderBefore, rate: rate(assigned, ordered - riderBefore) },
        offers: {
          accepted: outcome('accepted'),
          rejected: outcome('rejected'),
          noAnswer: outcome('no_answer'),
          expired: outcome('expired'),
          rate: rate(outcome('accepted'), answered),
          averageWave: acceptedWaves.length
            ? acceptedWaves.reduce((t, w) => t + w, 0) / acceptedWaves.length
            : null,
        },
        cancellations: {
          riderBeforeAssignmentRate: rate(riderBefore, ordered),
          riderAfterAssignmentRate: rate(n('riderAfter'), ordered),
          driverRate: rate(n('driver'), ordered),
          topReasons,
        },
        money,
        kasimen,
        clients,
        unserved: {
          expired: n('expired'),
          demands: unserved.length,
          alerts,
          zones: unserved.length ? [{ lat: 14.69, lng: -17.45, demands: unserved.length, alerts }] : [],
        },
        satisfaction: {
          reviews: scores.length,
          averageStars: scores.length ? scores.reduce((t, x) => t + x, 0) / scores.length / 20 : null,
          lowRatingShare: rate(scores.filter((x) => x <= 60).length, scores.length),
        },
      };
    }

    const week = (s: Slice) => ({
      weekStart: s.weekStart,
      start: s.start,
      end: s.end,
      all: indicators(s, 'all'),
      people: indicators(s, 'people'),
      parcels: indicators(s, 'parcels'),
    });
    return {
      from,
      to,
      currency: CURRENCY,
      moneyVisible: withMoney,
      thresholds: THRESHOLDS,
      weeks: weekSlices.map(week),
      total: week(slices[slices.length - 1]),
    };
  }

  /** Dates en ISO, nombres a 1e-6 pres, generatedAt retire. */
  function normalize(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
    if (Array.isArray(value)) return value.map(normalize);
    if (value != null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([k]) => k !== 'generatedAt')
          .map(([k, v]) => [k, normalize(v)]),
      );
    }
    return value;
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  it('le jeu produit des cas utiles (rien de vide)', () => {
    const exp = expectedDashboard(PERIOD.from, PERIOD.to, true, new Date());
    const total = exp.total.all;
    expect(courses).toHaveLength(33);
    expect(total.orders.ordered).toBe(31);
    expect(total.kasimen.retained).toBeGreaterThan(0);
    expect(total.unserved.alerts).toBe(1);
    expect(total.money!.commissionRecovered).toBeGreaterThan(0);
    expect(exp.weeks[0].all.money!.blockedKasimen).toBe(1);
    expect(exp.weeks[1].all.money!.blockedKasimen).toBe(0);
    expect(total.cancellations.topReasons.length).toBe(3);
    expect(total.offers.rejected).toBe(2);
    expect(exp.total.parcels.orders.completed).toBe(4);
  });

  it('pilotDashboard : chaque indicateur egale le calcul attendu (Requests_View + ProviderWallet_View)', async () => {
    const resolver = await resolverFor(['Requests_View', 'ProviderWallet_View']);
    for (const period of [PERIOD, PARTIAL]) {
      const before = new Date();
      const actual = await resolver.pilotDashboard(period.from, period.to);
      expect(actual.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(normalize(actual)).toEqual(normalize(expectedDashboard(period.from, period.to, true, actual.generatedAt)));
    }
  });

  it('Requests_View seul : indicateurs complets, argent a null', async () => {
    const resolver = await resolverFor(['Requests_View']);
    const actual = await resolver.pilotDashboard(PERIOD.from, PERIOD.to);
    expect(actual.moneyVisible).toBe(false);
    expect([...actual.weeks, actual.total].flatMap((w) => [w.all.money, w.people.money, w.parcels.money])).toEqual(
      [null, null, null, null, null, null, null, null, null],
    );
    expect(normalize(actual)).toEqual(normalize(expectedDashboard(PERIOD.from, PERIOD.to, false, actual.generatedAt)));
  });

  it('sans Requests_View : les quatre requetes sont refusees', async () => {
    for (const permissions of [[], ['ProviderWallet_View'], ['Drivers_View', 'RiderWallet_View']]) {
      const resolver = await resolverFor(permissions);
      for (const call of [
        () => resolver.pilotDashboard(PERIOD.from, PERIOD.to),
        () => resolver.pilotCancelReasons(PERIOD.from, PERIOD.to),
        () => resolver.pilotTopKasimen(PERIOD.from, PERIOD.to),
        () => resolver.pilotExport(PERIOD.from, PERIOD.to),
      ]) {
        expect({ permissions, error: await errorOf(call()) }).toEqual({ permissions, error: 'PERMISSION_NOT_GRANTED' });
      }
    }
  });

  it('periode invalide refusee (PILOT_PERIOD_INVALID)', async () => {
    const resolver = await resolverFor(['Requests_View']);
    const invalid: Array<[Date, Date]> = [
      [PERIOD.to, PERIOD.from],
      [PERIOD.from, PERIOD.from],
      [new Date('x'), PERIOD.to],
      [new Date(PERIOD.to.getTime() - 401 * DAY), PERIOD.to],
    ];
    for (const [from, to] of invalid) {
      const error = await resolver.pilotDashboard(from, to).then(
        () => null,
        (e) => (e as { extensions?: { code?: string } }).extensions?.code,
      );
      expect(error).toBe('PILOT_PERIOD_INVALID');
    }
  });

  it('pilotCancelReasons : par auteur et par motif, sans motif compris (BetterSuite)', async () => {
    const resolver = await resolverFor(['Requests_View']);
    const expected = new Map<string, { canceledBy: string; reasonId: number | null; title: string | null; userType: string | null; count: number }>();
    for (const c of courses.filter((x) => x.ts >= PERIOD.from && x.ts < PERIOD.to)) {
      if (!['riderBefore', 'riderAfter', 'driver'].includes(c.status)) continue;
      const canceledBy = c.status === 'driver' ? 'Driver' : 'Rider';
      const r = Object.values(reasons).find((x) => x.id === c.reasonId);
      const key = `${canceledBy}|${c.reasonId}`;
      const row = expected.get(key) ?? { canceledBy, reasonId: c.reasonId, title: r?.title ?? null, userType: r?.userType ?? null, count: 0 };
      row.count++;
      expected.set(key, row);
    }
    const sorted = [...expected.values()].sort(
      (a, b) =>
        b.count - a.count ||
        b.canceledBy.localeCompare(a.canceledBy) ||
        (a.reasonId ?? Infinity) - (b.reasonId ?? Infinity),
    );
    expect(sorted.some((r) => r.reasonId == null)).toBe(true);
    expect(await resolver.pilotCancelReasons(PERIOD.from, PERIOD.to)).toEqual(sorted);
  });

  it('pilotTopKasimen : courses terminees puis gains (BetterSuite, adapte)', async () => {
    const resolver = await resolverFor(['Requests_View']);
    const byDriver = new Map<number, { completed: number; earnings: number }>();
    for (const c of courses.filter((x) => x.status === 'completed' && x.ts >= PERIOD.from && x.ts < PERIOD.to)) {
      const row = byDriver.get(c.driverId!) ?? { completed: 0, earnings: 0 };
      row.completed++;
      row.earnings += c.cost - c.cost * COMMISSION;
      byDriver.set(c.driverId!, row);
    }
    const expected = [...byDriver]
      .sort((a, b) => b[1].completed - a[1].completed || b[1].earnings - a[1].earnings || a[0] - b[0])
      .slice(0, 10)
      .map(([id, r]) => ({
        id,
        name: `Kasiman ${world.driverIds.indexOf(id) + 1}`,
        avatarUrl: null,
        completed: r.completed,
        earnings: r.earnings,
        currency: CURRENCY,
      }));
    expect(expected.length).toBeGreaterThan(2);
    expect(normalize(await resolver.pilotTopKasimen(PERIOD.from, PERIOD.to))).toEqual(normalize(expected));
  });

  it('pilotExport : un CSV, une ligne par semaine et par famille, argent vide sans ProviderWallet_View', async () => {
    const written: string[] = [];
    try {
      for (const withMoney of [true, false]) {
        const resolver = await resolverFor(withMoney ? ['Requests_View', 'ProviderWallet_View'] : ['Requests_View']);
        const result = await resolver.pilotExport(PERIOD.from, PERIOD.to);
        written.push(join(process.cwd(), result.url));
        expect(result.url).toMatch(/^uploads\/pilote-.*\.csv$/);
        expect(result.rows).toBe(9);
        const lines = (await readFile(join(process.cwd(), result.url), 'utf-8')).trim().split('\n');
        expect(lines).toHaveLength(10);
        const header = lines[0].split(',');
        const rows = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [header[i], v])));
        const exp = expectedDashboard(PERIOD.from, PERIOD.to, withMoney, new Date());
        const total = rows.find((r) => r.semaine === 'periode' && r.famille === 'tous')!;
        expect(total.commandees).toBe(String(exp.total.all.orders.ordered));
        expect(total.terminees).toBe(String(exp.total.all.orders.completed));
        expect(total.kasimen_retenus).toBe(String(exp.total.all.kasimen.retained));
        expect(total.commission_especes_due).toBe(withMoney ? String(exp.total.all.money!.commissionDue) : '');
        expect(total.commission_especes_recouvree).toBe(
          withMoney ? String(exp.total.all.money!.commissionRecovered) : '',
        );
        const colis = rows.find((r) => r.semaine === exp.weeks[1].weekStart!.toISOString().slice(0, 10) && r.famille === 'colis')!;
        expect(colis.terminees).toBe(String(exp.weeks[1].parcels.orders.completed));
        expect(colis.commission_especes_due).toBe('');
      }
    } finally {
      for (const file of written) await unlink(file).catch(() => undefined);
    }
  });

  it('schema GraphQL : les quatre requetes et leurs types se construisent', async () => {
    const app = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule, { logger: false });
    try {
      const schema = await app.get(GraphQLSchemaFactory).create([PilotInsightsResolver]);
      const sdl = printSchema(schema);
      expect(sdl).toContain('pilotDashboard(from: DateTime!, to: DateTime!): PilotDashboard!');
      expect(sdl).toContain('pilotCancelReasons(from: DateTime!, to: DateTime!): [PilotCancelReason!]!');
      expect(sdl).toContain('pilotTopKasimen(from: DateTime!, to: DateTime!): [PilotKasiman!]!');
      expect(sdl).toContain('pilotExport(from: DateTime!, to: DateTime!): PilotExport!');
      expect(sdl).toContain('money: PilotMoney');
    } finally {
      await app.close();
    }
  });

  it('fin : grand livre conforme et toujours immuable apres le replacement dans le temps', async () => {
    const report = await integrity(ds);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(await errorOf(ds.query(`UPDATE ledger_entry SET motif = motif WHERE id = (SELECT min(id) FROM ledger_entry)`))).toMatch(
      /LEDGER_IMMUTABLE/,
    );
  });
});
