/**
 * Critere de sortie de la phase 1 sur la chaine reelle du pilote (2026-10-20).
 * Points : p1-tests, p1-transitions, p1-resync, p1-unicite, p2-dispatch, p2-argent.
 *
 * « 50 courses simulees d'affilee (dont coupures reseau et rejeux) sans double
 * assignation, sans doublon et sans offre perdue » (feuille de route, phase 1).
 *
 * Le test « 50 courses » de driver-order-transitions.int-spec.ts insere les
 * courses en SQL, en mode legacy, especes seulement. Celui-ci rejoue le
 * parcours que vivront les Kasimen et les clients a Dakar, en DISPATCH_MODE=waves :
 *
 *   devis (getFare) -> commande (createOrder, doublee quand l'app expire a 20 s)
 *   -> vagues 1, 2, 3 km puis rayon du service (jobs deroules pas a pas, et
 *   parfois rejoues comme une reprise BullMQ) -> relecture des offres par
 *   chaque Kasiman sollicite (availableOrders apres une coupure : p1-resync)
 *   -> refus, acceptations concurrentes -> arrivee, demarrage, fin, chaque
 *   etape envoyee deux fois en meme temps puis rejouee -> paiement especes
 *   ou portefeuille, annulations client et Kasiman, « aucun Kasiman », et
 *   livraisons Kasi Moto (taille du colis contre capacite du Kasiman).
 *
 * Melange de 7 scenarios, tire par une graine fixe (rejouable). Un Kasiman
 * bloque pour dette est place au plus pres de chaque course : il ne doit
 * jamais etre sollicite. Chaque course verifie ses invariants ; a la fin, les
 * portefeuilles sont compares au calcul attendu et au grand livre.
 *
 *   npm run test:integration -- cycle-pilote
 *   KASI_PILOT_SEED=7 KASI_PILOT_COURSES=200 npm run test:integration -- cycle-pilote
 *
 * Limites : courses l'une apres l'autre (pas deux courses qui se disputent le
 * meme Kasiman au meme instant) ; delais BullMQ non attendus (l'ordre des
 * jobs est celui de la file, les delais sont verifies par dispatch-waves) ;
 * diffusion, push et itineraire simules (harness.ts).
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  ALMADIES,
  buildAdminApi,
  buildDispatchWaves,
  buildDriverApi,
  buildRiderApi,
  concurrently,
  createOperator,
  createRegion,
  createWorld,
  CURRENCY,
  Doubles,
  DriverStatus,
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
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { DriverDeductTransactionType } from '../../../../../libs/database/src/lib/entities/enums/driver-deduct-transaction-type.enum';
import { RiderRechargeTransactionType } from '../../../../../libs/database/src/lib/entities/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '../../../../../libs/database/src/lib/entities/enums/transaction-action.enum';
import { LedgerAccounts, postManualOperation } from '../../../../../libs/database/src/lib/order/ledger';
import { OrderResolver as RiderOrderResolver } from '../../../../rider-api/src/app/order/order.resolver';
import { DispatchWaveService } from './dispatch-wave.service';

const SEED = Number(process.env.KASI_PILOT_SEED ?? 20261020);
const COURSES = Number(process.env.KASI_PILOT_COURSES ?? 50);

type Scenario =
  | 'cash' // especes, cas courant a Dakar
  | 'wallet' // paye par le portefeuille du client
  | 'refusal' // le premier sollicite refuse, un autre accepte
  | 'riderCancelBefore' // le client annule pendant la recherche
  | 'riderCancelAfter' // le client annule apres l'acceptation (frais)
  | 'driverCancel' // le Kasiman annule apres l'acceptation
  | 'noKasiman' // personne dans le rayon : « aucun Kasiman »
  | 'delivery'; // colis Kasi Moto (pilote B2B), especes, capacite du Kasiman

/** Repartition pour 50 courses (mise a l'echelle si KASI_PILOT_COURSES change). */
const MIX: Array<[Scenario, number]> = [
  ['cash', 18],
  ['delivery', 6],
  ['wallet', 6],
  ['refusal', 6],
  ['riderCancelBefore', 4],
  ['riderCancelAfter', 4],
  ['driverCancel', 3],
  ['noKasiman', 3],
];

const ELIGIBLE = 7; // Kasimen en ligne, sans dette
const FEE_TOTAL = 500; // frais d'annulation client apres acceptation
const FEE_DRIVER = 300; // dont part du Kasiman
const COMMISSION = 0.1; // providerSharePercent du service
const WALLET_START = 100_000;
const BLOCKED_DEBT = -12_000; // au-dela du plafond de 10 000
const KM_LAT = 0.008993; // 1 km vers le nord, en degres de latitude

/** Generateur pseudo-aleatoire a graine (mulberry32) : un echec se rejoue. */
function seeded(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    chance: (p: number) => next() < p,
  };
}

const TERMINAL = [
  OrderStatus.WaitingForReview,
  OrderStatus.RiderCanceled,
  OrderStatus.DriverCanceled,
  OrderStatus.Expired,
];

describe('Phase 1 : 50 courses du pilote de bout en bout (vagues, rejeux, coupures)', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let queue: RecordingQueue;
  let waves: DispatchWaveService;
  const savedMode = process.env.DISPATCH_MODE;

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
  });
  afterAll(async () => {
    if (savedMode == null) delete process.env.DISPATCH_MODE;
    else process.env.DISPATCH_MODE = savedMode;
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });

  it(`${COURSES} courses d'affilee (graine ${SEED})`, async () => {
    await resetDatabase(ds, redis);
    process.env.DISPATCH_MODE = 'waves';
    const rand = seeded(SEED);
    d = makeDoubles();
    world = await createWorld(ds, {
      drivers: ELIGIBLE + 1,
      providerSharePercent: COMMISSION * 100,
      cancellationTotalFee: FEE_TOTAL,
      cancellationDriverShare: FEE_DRIVER,
    });
    await ds.query(`UPDATE service SET "searchRadius" = 5000 WHERE id = $1`, [world.serviceId]);
    for (const driverId of world.driverIds) {
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
        driverId,
        world.serviceId,
      ]);
    }
    await createRegion(ds, [world.serviceId]);
    await setServicePricing(ds, world.serviceId); // 500 + 50 / 100 m + 10 / min
    // Kasi Moto (pilote B2B) : service de livraison servi par la meme flotte
    // (un Kasiman unique). 5 Kasimen livrent (petit, moyen, grand colis), 2 taxis non.
    const [{ id: deliveryServiceId }] = await ds.query(
      `WITH m AS (INSERT INTO media (address) VALUES ('livraison.png') RETURNING id)
       INSERT INTO service ("categoryId", title, "mediaId", "cancellationTotalFee", "cancellationDriverShare",
         "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait", "orderType", "searchRadius")
       SELECT "categoryId", 'Kasi Moto', (SELECT id FROM m), "cancellationTotalFee", "cancellationDriverShare",
         "providerSharePercent", "providerShareFlat", "paymentMethod", "perMinuteWait", 'Delivery', 5000
         FROM service WHERE id = $1 RETURNING id`,
      [world.serviceId],
    );
    await setServicePricing(ds, deliveryServiceId);
    await ds.query(`INSERT INTO service_regions_region ("serviceId", "regionId") SELECT $1, id FROM region`, [
      deliveryServiceId,
    ]);
    const capacities: Array<'Small' | 'Medium' | 'Large' | null> = ['Small', 'Medium', 'Large', 'Large', 'Medium', null, null];
    for (const [i, driverId] of world.driverIds.entries()) {
      const size = i < ELIGIBLE ? capacities[i] : 'Large';
      await ds.query(
        `INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [driverId, deliveryServiceId],
      );
      await ds.query(`UPDATE driver SET "canDeliver" = $2, "maxPackageSize" = $3 WHERE id = $1`, [
        driverId,
        size != null,
        size,
      ]);
    }
    const taxis = world.driverIds.filter((_, i) => i < ELIGIBLE && capacities[i] == null);
    await ds.query(
      `INSERT INTO money_policy (currency, "debtLimit", "debtAlertThreshold") VALUES ($1, 10000, 7500)`,
      [CURRENCY],
    );

    const eligible = world.driverIds.slice(0, ELIGIBLE);
    const blocked = world.driverIds[ELIGIBLE];
    const operatorId = await createOperator(ds, ['DriverWallet_Edit', 'RiderWallet_Edit']);
    // Le Kasiman bloque l'est par une vraie ecriture (grand livre + portefeuille).
    await postManualOperation(ds.manager, {
      account: LedgerAccounts.kasiman(blocked),
      amount: BLOCKED_DEBT,
      currency: CURRENCY,
      operatorId,
      motif: 'Banc pilote : dette au-dela du plafond',
      walletFields: { action: TransactionAction.Deduct, deductType: DriverDeductTransactionType.Correction },
    });

    // Clients : 4 en especes, 1 qui paie par son portefeuille (recharge operateur).
    const cashRiders = [world.riderId];
    for (let i = 2; i <= 4; i++) {
      const [{ id }] = await ds.query(
        `INSERT INTO rider ("mobileNumber", "firstName") VALUES ($1, $2) RETURNING id`,
        [221770000000 + i, `Client ${i}`],
      );
      cashRiders.push(id);
    }
    const [{ id: walletRider }] = await ds.query(
      `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000009, 'Client portefeuille') RETURNING id`,
    );
    await buildAdminApi(ds, redis, d, operatorId).riderResolver.createRiderTransaction({
      riderId: walletRider,
      action: TransactionAction.Recharge,
      rechargeType: RiderRechargeTransactionType.Correction,
      amount: WALLET_START,
      currency: CURRENCY,
    } as never);

    queue = new RecordingQueue();
    waves = buildDispatchWaves(ds, redis, d, queue).waves;

    // ---------------------------------------------------------------------
    // Attendus, tenus a cote du code teste
    // ---------------------------------------------------------------------
    const expected = {
      admin: 0,
      drivers: new Map<number, number>([[blocked, BLOCKED_DEBT]]),
      riders: new Map<number, number>([[walletRider, WALLET_START]]),
      notified: { accepted: 0, arrived: 0, started: 0, finished: 0, canceled: 0, plainText: 0 },
    };
    const credit = (m: Map<number, number>, id: number, amount: number) => m.set(id, (m.get(id) ?? 0) + amount);
    const tally: Record<string, number> = {};
    const acceptedAtWave: Record<number, number> = {};
    let duplicateOrders = 0;
    let replayedJobs = 0;
    let resyncChecks = 0;

    const plan: Scenario[] = MIX.flatMap(([s, n]) => Array<Scenario>(Math.round((n * COURSES) / 50)).fill(s));
    while (plan.length < COURSES) plan.push('cash');
    plan.length = COURSES;
    for (let i = plan.length - 1; i > 0; i--) {
      const j = rand.int(0, i);
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }

    // ---------------------------------------------------------------------
    // Outils
    // ---------------------------------------------------------------------
    const driver = (driverId: number) => buildDriverApi(ds, redis, d, driverId);
    const rider = () => buildRiderApi(ds, redis, d);
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
    const attempts = async (orderId: number): Promise<Array<{ driverId: number; wave: number; outcome: string }>> =>
      ds.query(
        `SELECT "driverId", wave, outcome FROM dispatch_attempt WHERE "requestId" = $1 ORDER BY wave, rank`,
        [orderId],
      );
    const pending = async (orderId: number) =>
      (await attempts(orderId)).filter((a) => a.outcome === 'pending').map((a) => a.driverId);
    const visibleTo = async (driverId: number) =>
      (await driver(driverId).orderService.getOrdersForDriver(driverId)).map((o) => Number(o.id));

    /** File BullMQ simulee : un jobId ne s'execute qu'une fois, sauf reprise voulue. */
    const done = new Set<string>();
    async function runNextJob(orderId: number): Promise<boolean> {
      const job = queue.jobs.find((j) => j.data.orderId === orderId && !done.has(String(j.opts.jobId)));
      if (job == null) return false;
      done.add(String(job.opts.jobId));
      const run = () =>
        job.name === 'wave'
          ? waves.runWave({ orderId, wave: job.data.wave })
          : waves.expire({ orderId });
      await run();
      if (rand.chance(0.15)) {
        replayedJobs++;
        await run(); // reprise d'un job deja traite (worker relance)
      }
      return true;
    }
    /** Deroule la file jusqu'a ce que `until` soit vrai ou la file vide. */
    async function runJobsUntil(orderId: number, until: () => Promise<boolean>) {
      while (!(await until())) {
        if (!(await runNextJob(orderId))) return;
      }
    }

    /**
     * p1-resync : chaque Kasiman sollicite a peut-etre perdu l'evenement
     * (coupure au moment du dispatch). Il relit ses offres au retour du reseau :
     * l'offre doit y etre. Un Kasiman non sollicite ne la voit pas (Q6), le
     * Kasiman bloque jamais.
     */
    async function checkResync(orderId: number) {
      const asked = await pending(orderId);
      for (const driverId of eligible) {
        const sees = (await visibleTo(driverId)).includes(orderId);
        expect({ driverId, sees }).toEqual({ driverId, sees: asked.includes(driverId) });
        resyncChecks++;
      }
      expect(await visibleTo(blocked)).toEqual([]);
    }

    /** Une etape envoyee deux fois en meme temps (timeout de 20 s), puis rejouee. */
    async function step(driverId: number, update: Record<string, unknown>) {
      const results = await concurrently(2, () => driver(driverId).update(orderIdNow, update));
      for (const r of results) {
        if (r.status === 'rejected') throw r.reason;
      }
      await driver(driverId).update(orderIdNow, update);
    }
    let orderIdNow = 0;

    // ---------------------------------------------------------------------
    // Les courses
    // ---------------------------------------------------------------------
    for (let n = 0; n < COURSES; n++) {
      const scenario = plan[n];
      tally[scenario] = (tally[scenario] ?? 0) + 1;
      const riderId = scenario === 'wallet' ? walletRider : cashRiders[n % cashRiders.length];
      const label = `course ${n + 1} (${scenario})`;

      // Les Kasimen se sont deplaces ; le bloque est toujours le plus proche.
      const far = scenario === 'noKasiman';
      for (const driverId of eligible) {
        const km = far ? rand.int(80, 120) / 10 : rand.int(2, 35) / 10;
        await driver(driverId).driverRedis.setLocation(driverId, {
          lat: PLATEAU.lat + km * KM_LAT,
          lng: PLATEAU.lng,
        });
      }
      await driver(blocked).driverRedis.setLocation(blocked, { lat: PLATEAU.lat + 0.1 * KM_LAT, lng: PLATEAU.lng });

      // Trajet variable ; prix multiple de 10, commission entiere.
      d.routing.use('mapbox', rand.int(8, 60) * 100, rand.int(2, 25) * 60);

      // 1. Devis puis commande. App recente (quoteId) ou app installee (sans).
      const delivery = scenario === 'delivery';
      const serviceId = delivery ? deliveryServiceId : world.serviceId;
      const packageSize = delivery ? (['Small', 'Medium', 'Large'] as const)[rand.int(0, 2)] : undefined;
      const fare = await riderResolver(riderId).getFare({ points: [PLATEAU, ALMADIES] } as never);
      const shown = fare.services
        .flatMap((c) => c.services)
        .find((s) => Number(s.id) === serviceId) as unknown as { cost: number; quoteId?: string };
      expect(shown.quoteId).toBeDefined();
      const oldApp = rand.chance(0.25);
      const input = {
        serviceId,
        points: [PLATEAU, ALMADIES],
        addresses: ['Plateau', 'Almadies'],
        intervalMinutes: 0,
        quoteId: oldApp ? undefined : shown.quoteId,
        ...(delivery
          ? { packageSize, recipientName: 'Destinataire', recipientMobileNumber: '221770000099' }
          : {}),
      };
      let orderId: number;
      const send = async () => Number((await riderResolver(riderId).createOrder(input as never)).id);
      if (rand.chance(0.3)) {
        // bug-timeout : l'app a expire a 20 s et renvoie la commande, pendant
        // le traitement de la 1re ou apres. Une seule course, rendue a chaque envoi.
        duplicateOrders++;
        const sent = await concurrently(2, send);
        for (const r of sent) {
          if (r.status === 'rejected') throw r.reason;
        }
        const ids = (sent as Array<PromiseFulfilledResult<number>>).map((r) => r.value);
        ids.push(await send());
        expect({ label, ids }).toEqual({ label, ids: [ids[0], ids[0], ids[0]] });
        orderId = ids[0];
      } else {
        orderId = await send();
      }
      expect({ label, orders: await countOrders() }).toEqual({ label, orders: n + 1 });
      orderIdNow = orderId;
      const order0 = await orderRow(ds, orderId);
      // bug-prix : prix commande = prix affiche.
      expect({ label, cost: order0.costAfterCoupon }).toEqual({ label, cost: shown.cost });
      const cost = shown.cost;
      expect(d.dispatch.dispatched.filter((x) => x.orderId === orderId)).toEqual([{ orderId, delayMs: 0 }]);
      // Rien n'est visible avant la 1re vague.
      for (const driverId of eligible) expect(await visibleTo(driverId)).not.toContain(orderId);

      // 2. 1re vague (job pose par le producteur), puis les suivantes au besoin.
      done.add(`wave-${orderId}-1`);
      await waves.runWave({ orderId, wave: 1 });
      const someoneAsked = async () => (await pending(orderId)).length > 0;
      const finished = async () => (await orderRow(ds, orderId)).status === OrderStatus.Expired;

      if (scenario === 'noKasiman') {
        await runJobsUntil(orderId, finished);
        const row = await orderRow(ds, orderId);
        expect({ label, status: row.status }).toEqual({ label, status: OrderStatus.Expired });
        expect(await attempts(orderId)).toEqual([]);
        expected.notified.plainText++;
        await checkNoGhost(orderId);
        continue;
      }

      await runJobsUntil(orderId, async () => (await someoneAsked()) || (await finished()));
      expect({ label, asked: await someoneAsked() }).toEqual({ label, asked: true });
      await checkResync(orderId);

      if (scenario === 'riderCancelBefore') {
        const r = await concurrently(2, () => rider().update(orderId, riderId, cancelUpdate));
        expect(r.every((x) => x.status === 'fulfilled')).toBe(true);
        await rider().update(orderId, riderId, cancelUpdate);
        await runJobsUntil(orderId, async () => false); // la vague suivante s'arrete
        expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.RiderCanceled);
        // Personne ne peut plus prendre la course.
        const late = (await pending(orderId))[0] ?? eligible[0];
        expect(await errorOf(driver(late).update(orderId, { status: OrderStatus.DriverAccepted }))).toBe(
          'Already Taken',
        );
        await checkNoGhost(orderId);
        continue;
      }

      if (scenario === 'refusal') {
        const refuser = (await pending(orderId))[0];
        expect(await waves.reject(orderId, refuser)).toBe(true);
        expect(await waves.reject(orderId, refuser)).toBe(true); // rejeu du refus
        expect(await visibleTo(refuser)).not.toContain(orderId);
        await runJobsUntil(orderId, async () => (await someoneAsked()) || (await finished()));
        expect({ label, asked: await someoneAsked() }).toEqual({ label, asked: true });
        expect(await pending(orderId)).not.toContain(refuser);
        await checkResync(orderId);
      }

      // 3. Acceptation : deux sollicites en meme temps (ou un seul), puis le
      // gagnant rejoue (timeout). Un seul gagnant, le perdant lit « Already Taken ».
      if (delivery) {
        // Un taxi sans capacite de livraison ne prend pas le colis, meme en
        // connaissant son numero (controle a l'acceptation).
        expect((await orderRow(ds, orderId)).packageSize).toBe(packageSize);
        expect(await errorOf(driver(taxis[0]).update(orderId, { status: OrderStatus.DriverAccepted }))).toBe(
          'Already Taken',
        );
      }
      const candidates = (await pending(orderId)).slice(0, 2);
      const accept = await concurrently(candidates.length, (i) =>
        driver(candidates[i]).update(orderId, { status: OrderStatus.DriverAccepted }),
      );
      const won = accept.findIndex((r) => r.status === 'fulfilled');
      expect({ label, winners: accept.filter((r) => r.status === 'fulfilled').length }).toEqual({ label, winners: 1 });
      for (const r of accept) {
        if (r.status === 'rejected') expect((r.reason as Error).message).toBe('Already Taken');
      }
      const winner = candidates[won];
      await driver(winner).update(orderId, { status: OrderStatus.DriverAccepted });
      expected.notified.accepted++;
      const accepted = (await attempts(orderId)).find((a) => a.driverId === winner);
      acceptedAtWave[accepted?.wave ?? 0] = (acceptedAtWave[accepted?.wave ?? 0] ?? 0) + 1;
      // Les jobs restants de la course s'executent et ne font rien.
      await runJobsUntil(orderId, async () => false);
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.DriverAccepted);
      expect(await driverStatusOf(winner)).toBe(DriverStatus.InService);

      if (scenario === 'riderCancelAfter' || scenario === 'driverCancel') {
        if (rand.chance(0.5)) {
          await step(winner, { status: OrderStatus.Arrived });
          expected.notified.arrived++;
        }
        if (scenario === 'riderCancelAfter') {
          const r = await concurrently(2, () => rider().update(orderId, riderId, cancelUpdate));
          expect(r.every((x) => x.status === 'fulfilled')).toBe(true);
          await rider().update(orderId, riderId, cancelUpdate);
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.RiderCanceled);
          credit(expected.riders, riderId, -FEE_TOTAL);
          credit(expected.drivers, winner, FEE_DRIVER);
          expected.admin += FEE_TOTAL - FEE_DRIVER;
        } else {
          await step(winner, { status: OrderStatus.DriverCanceled });
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.DriverCanceled);
          expected.notified.canceled++;
        }
        expect(await driverStatusOf(winner)).toBe(DriverStatus.Online);
        await checkNoGhost(orderId);
        continue;
      }

      // 4. Arrivee, demarrage, fin : chaque etape doublee puis rejouee.
      await step(winner, { status: OrderStatus.Arrived });
      await step(winner, { status: OrderStatus.Started });
      expected.notified.arrived++;
      expected.notified.started++;
      const commission = Math.round(cost * COMMISSION);
      if (scenario === 'wallet') {
        await step(winner, { status: OrderStatus.Finished });
        credit(expected.riders, riderId, -cost);
        credit(expected.drivers, winner, cost - commission);
      } else {
        await step(winner, { status: OrderStatus.Finished }); // -> attente du paiement
        expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForPostPay);
        await step(winner, { status: OrderStatus.Finished, paidAmount: cost }); // especes encaissees
        credit(expected.drivers, winner, -commission);
      }
      expected.admin += commission;
      expected.notified.finished++;
      const row = await orderRow(ds, orderId);
      expect({ label, status: row.status, driverId: row.driverId }).toEqual({
        label,
        status: OrderStatus.WaitingForReview,
        driverId: winner,
      });
      const activities: Array<{ type: string; n: number }> = await ds.query(
        `SELECT type, count(*)::int AS n FROM request_activity WHERE "requestId" = $1 GROUP BY type`,
        [orderId],
      );
      expect({ label, ...Object.fromEntries(activities.map((a) => [a.type, a.n])) }).toEqual({
        label,
        RequestedByRider: 1,
        DriverAccepted: 1,
        ArrivedToPickupPoint: 1,
        Started: 1,
        ArrivedToDestination: 1,
        Paid: 1,
      });
      expect(await driverStatusOf(winner)).toBe(DriverStatus.Online);
      await checkNoGhost(orderId);
    }

    async function countOrders(): Promise<number> {
      return (await ds.query(`SELECT count(*)::int AS n FROM request`))[0].n;
    }
    async function driverStatusOf(driverId: number) {
      return (await ds.query(`SELECT status FROM driver WHERE id = $1`, [driverId]))[0].status;
    }
    /** Course close : plus aucune offre ouverte ni visible pour personne. */
    async function checkNoGhost(orderId: number) {
      expect((await attempts(orderId)).filter((a) => a.outcome === 'pending')).toEqual([]);
      for (const driverId of world.driverIds) expect(await visibleTo(driverId)).not.toContain(orderId);
    }

    // ---------------------------------------------------------------------
    // Invariants de fin
    // ---------------------------------------------------------------------
    // Toutes les courses sont closes, aucun Kasiman reste « en course ».
    const open: Array<{ id: number; status: string }> = await ds.query(
      `SELECT id, status FROM request WHERE status::text <> ALL($1::text[])`,
      [TERMINAL],
    );
    expect(open).toEqual([]);
    expect(await ds.query(`SELECT id FROM driver WHERE status = 'in service'`)).toEqual([]);
    expect(Number((await ds.query(`SELECT count(*)::int AS n FROM request`))[0].n)).toBe(COURSES);

    // Jamais deux activites du meme type sur une course (bug-doublon-statut).
    expect(
      await ds.query(
        `SELECT "requestId", type, count(*)::int AS n FROM request_activity
          GROUP BY "requestId", type HAVING count(*) > 1`,
      ),
    ).toEqual([]);
    // Une seule acceptation par course, et c'est le Kasiman de la course.
    expect(
      await ds.query(
        `SELECT a."requestId" FROM dispatch_attempt a JOIN request r ON r.id = a."requestId"
          WHERE a.outcome = 'accepted' GROUP BY a."requestId", r."driverId"
         HAVING count(*) > 1 OR bool_or(a."driverId" <> r."driverId")`,
      ),
    ).toEqual([]);
    // Livraison : jamais un Kasiman qui ne livre pas, ou de capacite trop petite.
    expect(
      await ds.query(
        `SELECT a."requestId", a."driverId" FROM dispatch_attempt a
           JOIN request r ON r.id = a."requestId" JOIN driver dr ON dr.id = a."driverId"
          WHERE r."serviceId" = $1 AND (NOT dr."canDeliver"
             OR (CASE dr."maxPackageSize"::text WHEN 'Large' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END)
              < (CASE r."packageSize"::text WHEN 'Large' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END))`,
        [deliveryServiceId],
      ),
    ).toEqual([]);
    // Le Kasiman bloque pour dette n'a jamais ete sollicite.
    expect(await ds.query(`SELECT id FROM dispatch_attempt WHERE "driverId" = $1`, [blocked])).toEqual([]);

    // Argent : chaque portefeuille vaut le calcul attendu, au franc pres.
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(expected.admin);
    for (const driverId of world.driverIds) {
      expect({ driverId, balance: (await walletBalance(ds, 'driver_wallet', { driverId })) ?? 0 }).toEqual({
        driverId,
        balance: expected.drivers.get(driverId) ?? 0,
      });
    }
    for (const riderId of [...cashRiders, walletRider]) {
      expect({ riderId, balance: (await walletBalance(ds, 'rider_wallet', { riderId })) ?? 0 }).toEqual({
        riderId,
        balance: expected.riders.get(riderId) ?? 0,
      });
    }
    // Chaque operation d'argent comptee une fois (p1-unicite).
    expect(
      await ds.query(
        `SELECT "requestId", "deductType" FROM driver_transaction
          WHERE "deductType" = 'Commission' GROUP BY "requestId", "deductType" HAVING count(*) > 1`,
      ),
    ).toEqual([]);
    // Grand livre equilibre et conforme aux portefeuilles (p2-argent I2).
    const report = await integrity(ds);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);

    // Une notification client par evenement, jamais deux.
    for (const [method, count] of Object.entries(expected.notified)) {
      expect({ method, count: d.riderNotifications.count(method) }).toEqual({ method, count });
    }

    // Compte rendu (repris dans KASI_DECISIONS.md).
    console.log(
      [
        `Banc pilote : ${COURSES} courses, graine ${SEED}, mode waves`,
        `  scenarios : ${JSON.stringify(tally)}`,
        `  acceptation par vague : ${JSON.stringify(acceptedAtWave)}`,
        `  commandes doublees (timeout) : ${duplicateOrders} ; jobs rejoues : ${replayedJobs} ; relectures d'offres verifiees : ${resyncChecks}`,
        `  commission Kasi : ${expected.admin} FCFA ; ecritures au grand livre : ${report.entryCount}`,
      ].join('\n'),
    );
  }, 600_000);
});
