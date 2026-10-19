/**
 * p2-argent I3 (2026-10-19) : dette especes du Kasiman et plafond, contre
 * PostgreSQL et Redis reels (docs/fiche-conception-argent.md §4 et §7 « I3 »).
 *
 *   npm run test:integration -- debt-limit
 *
 * Politique de chaque test : XOF, plafond 10 000, alerte 7 500 (valeurs
 * validees le 2026-10-19). Les tables etant videes avant chaque test, la
 * ligne inseree par la migration n'existe pas ici : les autres fichiers du
 * banc tournent sans plafond.
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { GraphQLError } from 'graphql';

import {
  buildAdminApi,
  buildDriverApi,
  concurrently,
  countRows,
  createOperator,
  createOrder,
  createWorld,
  CURRENCY,
  Doubles,
  errorOf,
  integrity,
  ledgerBalance,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { CronJobService } from '../../../../../apps/driver-api/src/app/order/cron-job.service';
import { KasimanAccountResolver } from '../../../../../apps/driver-api/src/app/wallet/kasiman-account.resolver';
import { DriverDeductTransactionType } from '../entities/enums/driver-deduct-transaction-type.enum';
import { RiderRechargeTransactionType } from '../entities/enums/rider-recharge-transaction-type.enum';
import { ShiftRuleEntity } from '../entities/shift-rule.entity';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import {
  debtCrossing,
  debtLevel,
  DebtLevel,
  isBlockedForDebt,
  KASIMAN_DEBT_LIMIT,
} from './debt-limit';
import { LedgerAccounts, postManualOperation } from './ledger';

const PLATEAU = { lat: 14.6928, lng: -17.4467 };
const POLICY = { currency: CURRENCY, debtLimit: 10000, debtAlertThreshold: 7500 };

describe('p2-argent I3 : dette especes et plafond', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let operatorId: number;
  const api = (i = 0) => buildDriverApi(ds, redis, d, world.driverIds[i]);
  const admin = (id = operatorId) => buildAdminApi(ds, redis, d, id);
  const blockedId = () => world.driverIds[0];
  const freeId = () => world.driverIds[1];

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
  });
  afterAll(async () => {
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });

  async function setUp(drivers: number, firstDriverInFleet = false) {
    await resetDatabase(ds, redis);
    d = makeDoubles();
    world = await createWorld(ds, { drivers, providerSharePercent: 10, firstDriverInFleet });
    await ds.query(
      `INSERT INTO money_policy (currency, "debtLimit", "debtAlertThreshold") VALUES ($1, $2, $3)`,
      [POLICY.currency, POLICY.debtLimit, POLICY.debtAlertThreshold],
    );
    for (const driverId of world.driverIds) {
      await ds.query(
        `INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`,
        [driverId, world.serviceId],
      );
    }
    operatorId = await createOperator(ds, ['DriverWallet_Edit']);
  }

  beforeEach(async () => {
    await setUp(2);
  });

  /** Debit manuel du Kasiman (operation du back-office, ecriture equilibree). */
  async function debit(driverId: number, amount: number) {
    await postManualOperation(ds.manager, {
      account: LedgerAccounts.kasiman(driverId),
      amount: -amount,
      currency: CURRENCY,
      operatorId,
      motif: 'Test : dette',
      walletFields: {
        action: TransactionAction.Deduct,
        deductType: DriverDeductTransactionType.Correction,
      },
    });
  }

  async function balance(driverId: number): Promise<number> {
    return (await walletBalance(ds, 'driver_wallet', { driverId })) ?? 0;
  }

  async function placeDrivers() {
    const shared = api();
    for (const driverId of world.driverIds) {
      await shared.driverRedis.setLocation(driverId, {
        lat: PLATEAU.lat + 0.001,
        lng: PLATEAU.lng,
      });
    }
  }

  /** Offre ouverte, inscrite dans Redis comme le fait createOrder. */
  async function openOffer(status = OrderStatus.Requested): Promise<number> {
    const orderId = await createOrder(ds, world, { status });
    const order = await orderRow(ds, orderId);
    await api().orderRedis.add({ ...order, fleetIds: [] } as never, 0);
    return orderId;
  }

  async function settle(amount: number, key: string, id = operatorId) {
    return admin(id).driverResolver.settleDriverDebt({
      driverId: blockedId(),
      amount,
      currency: CURRENCY,
      receiptNumber: `R-${key}`,
      motif: 'Depot especes au siege',
      idempotencyKey: key,
    } as never);
  }

  async function started(driverId = blockedId()): Promise<number> {
    return createOrder(ds, world, { status: OrderStatus.Started, driverId });
  }

  async function finishCash(driverIndex: number, orderId: number, cash = 2000) {
    return api(driverIndex).update(orderId, {
      status: OrderStatus.Finished,
      paidAmount: cash,
    });
  }

  describe('regle', () => {
    it('bloque strictement au-dela du plafond, alerte a partir du seuil, rien sans politique', async () => {
      expect(debtLevel(-7499, POLICY)).toBe(DebtLevel.Ok);
      expect(debtLevel(-7500, POLICY)).toBe(DebtLevel.Alert);
      expect(debtLevel(-10000, POLICY)).toBe(DebtLevel.Alert);
      expect(debtLevel(-10001, POLICY)).toBe(DebtLevel.Blocked);
      expect(debtLevel(-50000, null)).toBe(DebtLevel.Ok);
      expect(debtCrossing(-7000, -11000, POLICY)).toBe(DebtLevel.Blocked);
      expect(debtCrossing(-11000, -12000, POLICY)).toBeNull();

      await debit(blockedId(), 10000);
      expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(false);
      await debit(blockedId(), 1);
      expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(true);
      expect(await isBlockedForDebt(ds.manager, blockedId())).toBe(true);
      expect(await isBlockedForDebt(ds.manager, blockedId(), 'EUR')).toBe(false);
      expect(await isBlockedForDebt(ds.manager, freeId(), CURRENCY)).toBe(false);
      // Plafond releve sans deploiement : debloque aussitot.
      await ds.query(`UPDATE money_policy SET "debtLimit" = 20000 WHERE currency = $1`, [
        CURRENCY,
      ]);
      expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(false);
    });
  });

  describe('les quatre endroits (fiche §4.2)', () => {
    beforeEach(async () => {
      await debit(blockedId(), 10300);
      await placeDrivers();
    });

    it('createOrder : le Kasiman bloque n est pas parmi les Kasimen prevenus', async () => {
      const shared = api().sharedDriver;
      const drivers = await shared.getOnlineDriversWithServiceId(
        world.driverIds,
        world.serviceId,
        [],
      );
      expect(drivers.map((x) => x.id)).toEqual([freeId()]);
      const inCurrency = await shared.getOnlineDriversWithServiceId(
        world.driverIds,
        world.serviceId,
        [],
        undefined,
        CURRENCY,
      );
      expect(inCurrency.map((x) => x.id)).toEqual([freeId()]);
    });

    it('processPrePay : ni abonnement ni push pour le Kasiman bloque', async () => {
      const orderId = await createOrder(ds, world, { status: OrderStatus.WaitingForPrePay });
      await api().sharedOrder.processPrePay(orderId);
      const created = d.pubSub.events.filter((e) => e.trigger === 'orderCreated');
      expect(created).toHaveLength(1);
      expect((created[0].payload as { driverIds: number[] }).driverIds).toEqual([freeId()]);
      expect(d.driverNotifications.count('requests')).toBe(1);
    });

    it('availableOrders : liste vide pour le Kasiman bloque, pas pour les autres', async () => {
      const orderId = await openOffer();
      expect(await api(0).orderService.getOrdersForDriver(blockedId())).toEqual([]);
      const free = await api(1).orderService.getOrdersForDriver(freeId());
      expect(free.map((o) => o.id)).toEqual([orderId]);
    });

    it('relance du cron : le Kasiman bloque n est pas relance', async () => {
      const orderId = await openOffer();
      const sent: number[][] = [];
      const shared = api();
      // Anomalie preexistante, hors I3 (p2-dispatch, bug-offre-perdue) :
      // OrderRedisService.getRequestIdsInTimeRage lit `request-time` par RANG
      // (zrange) avec des bornes en millisecondes, et ne renvoie donc jamais
      // rien : la relance du cron ne part pas. On fournit ici la course en
      // attente pour eprouver le filtre de dette de la relance.
      const orderRedis = Object.create(shared.orderRedis);
      orderRedis.getRequestIdsInTimeRage = async () => [String(orderId)];
      const cron = new CronJobService(
        shared.orderService,
        { findByIds: async () => [], expireDriverStatus: async () => undefined } as never,
        redis as never,
        shared.driverRedis,
        orderRedis,
        {
          requests: async (drivers: Array<{ id: number }>) => {
            sent.push(drivers.map((x) => x.id));
          },
        } as never,
        shared.sharedDriver,
        shared.sharedFleet,
        ds.getRepository(ShiftRuleEntity),
      );
      await cron.cronTask();
      expect(sent).toEqual([[freeId()]]);
    });

    it('acceptation refusee avec un message lisible et le code KASIMAN_DEBT_LIMIT', async () => {
      const orderId = await openOffer();
      let error: GraphQLError | null = null;
      try {
        await api(0).update(orderId, { status: OrderStatus.DriverAccepted });
      } catch (e) {
        error = e as GraphQLError;
      }
      expect(error).not.toBeNull();
      expect(error!.message).toBe(
        'Votre solde Kasi est de −10 300 FCFA, au-delà du plafond de ' +
          '10 000 FCFA. Réglez votre dette pour recevoir de nouvelles courses.',
      );
      // driver-app masque les messages contenant « forbidden » ou « unauthorized ».
      expect(error!.message.toLowerCase()).not.toMatch(/forbidden|unauthorized/);
      expect(error!.extensions?.['code']).toBe(KASIMAN_DEBT_LIMIT);
      const row = await orderRow(ds, orderId);
      expect(row.status).toBe(OrderStatus.Requested);
      expect(row.driverId).toBeNull();
      expect(await countRows(ds, 'request_activity', `"requestId" = $1`, [orderId])).toBe(0);
      // Un autre Kasiman prend la course normalement.
      const taken = await api(1).update(orderId, { status: OrderStatus.DriverAccepted });
      expect(taken.driverId).toBe(freeId());
    });

    it('attribution par l operateur : permise malgre la dette', async () => {
      const orderId = await openOffer();
      await admin().sharedOrder.assignOrderToDriver(orderId, blockedId());
      const row = await orderRow(ds, orderId);
      expect(row.driverId).toBe(blockedId());
      expect(row.status).toBe(OrderStatus.DriverAccepted);
    });
  });

  it('course en cours : terminee normalement par un Kasiman devenu bloque', async () => {
    await placeDrivers();
    const orderId = await openOffer();
    await api(0).update(orderId, { status: OrderStatus.DriverAccepted });
    await debit(blockedId(), 10300);
    await api(0).update(orderId, { status: OrderStatus.Arrived });
    await api(0).update(orderId, { status: OrderStatus.Started });
    const done = await finishCash(0, orderId);
    expect(done.status).toBe(OrderStatus.WaitingForReview);
    expect(await balance(blockedId())).toBe(-10500); // commission de 200 en plus
    expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(true);
  });

  describe('push au passage d un seuil', () => {
    it('une seule push d alerte, une seule de blocage, aucune au rejeu', async () => {
      await debit(blockedId(), 7400);
      const first = await started();
      await finishCash(0, first); // -7 600 : alerte
      expect(await balance(blockedId())).toBe(-7600);
      expect(d.driverNotifications.count('plainText')).toBe(1);
      await finishCash(0, first); // rejeu
      await finishCash(0, await started()); // -7 800 : deja en alerte
      expect(d.driverNotifications.count('plainText')).toBe(1);

      await debit(blockedId(), 2100); // -9 900, operation manuelle
      await finishCash(0, await started()); // -10 100 : bloque
      expect(d.driverNotifications.count('plainText')).toBe(2);
      await finishCash(0, await started()); // course deja en cours : terminee, sans push
      expect(await balance(blockedId())).toBe(-10300);
      expect(d.driverNotifications.count('plainText')).toBe(2);
    });

    it('deux fins de course simultanees qui franchissent le seuil : une seule push', async () => {
      await debit(blockedId(), 7400);
      const orders = [await started(), await started()];
      const results = await concurrently(2, (i) => finishCash(0, orders[i]));
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(await balance(blockedId())).toBe(-7800);
      expect(d.driverNotifications.count('plainText')).toBe(1);
    });
  });

  describe('reglement par un operateur (settleDriverDebt)', () => {
    beforeEach(async () => {
      await debit(blockedId(), 10300);
      await placeDrivers();
    });

    it('debloque aussitot : offres visibles et acceptation permise', async () => {
      const orderId = await openOffer();
      expect(await api(0).orderService.getOrdersForDriver(blockedId())).toEqual([]);
      const wallet = await settle(3000, 'k-1');
      expect(Number(wallet!.balance)).toBe(-7300);
      expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(false);
      const visible = await api(0).orderService.getOrdersForDriver(blockedId());
      expect(visible.map((o) => o.id)).toEqual([orderId]);
      const taken = await api(0).update(orderId, { status: OrderStatus.DriverAccepted });
      expect(taken.driverId).toBe(blockedId());

      const [entry] = await ds.query(
        `SELECT "idempotencyKey", nature, motif, reference, "operatorId" FROM ledger_entry
          WHERE nature = 'REGLEMENT_DETTE'`,
      );
      expect(entry).toEqual({
        idempotencyKey: 'debt-settlement:k-1',
        nature: 'REGLEMENT_DETTE',
        motif: 'Depot especes au siege',
        reference: 'R-k-1',
        operatorId,
      });
      expect(await ledgerBalance(ds, 'CAISSE:SIEGE')).toBe(-3000);
      expect((await integrity(ds)).issues).toEqual([]);
    });

    it('rejoue en serie et en parallele : un seul credit', async () => {
      await settle(1000, 'k-2');
      await settle(1000, 'k-2');
      const results = await concurrently(5, () => settle(1000, 'k-2'));
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(await balance(blockedId())).toBe(-9300);
      expect(
        await countRows(ds, 'ledger_entry', `"idempotencyKey" = 'debt-settlement:k-2'`),
      ).toBe(1);
      expect(
        await countRows(ds, 'driver_transaction', `"idempotencyKey" = 'debt-settlement:k-2'`),
      ).toBe(1);
    });

    it('refuse un montant superieur a la dette, un motif vide et un operateur sans permission', async () => {
      expect(await errorOf(settle(10301, 'k-3'))).toMatch(/dépasse la dette/);
      expect(
        await errorOf(
          admin().driverResolver.settleDriverDebt({
            driverId: blockedId(),
            amount: 100,
            currency: CURRENCY,
            receiptNumber: 'R',
            motif: '  ',
            idempotencyKey: 'k-4',
          } as never),
        ),
      ).toMatch(/obligatoires/);
      const viewer = await createOperator(ds, []);
      expect(await errorOf(settle(100, 'k-5', viewer))).toBe('PERMISSION_NOT_GRANTED');
      expect(await balance(blockedId())).toBe(-10300);
      expect(await countRows(ds, 'ledger_entry', `nature = 'REGLEMENT_DETTE'`)).toBe(0);
    });
  });

  it('compensation : une course payee en ligne reduit la dette et debloque', async () => {
    await debit(blockedId(), 10300);
    await postManualOperation(ds.manager, {
      account: LedgerAccounts.client(world.riderId),
      amount: 5000,
      currency: CURRENCY,
      operatorId,
      motif: 'Test : credit client',
      walletFields: {
        action: TransactionAction.Recharge,
        rechargeType: RiderRechargeTransactionType.Gift,
      },
    });
    await finishCash(0, await started(), 0);
    // +2 000 (prix paye par le portefeuille du client) - 200 (commission).
    expect(await balance(blockedId())).toBe(-8500);
    expect(await isBlockedForDebt(ds.manager, blockedId(), CURRENCY)).toBe(false);
  });

  it('flotte (option A) : sa part est payee a la fin de course, meme Kasiman endette', async () => {
    await setUp(1, true);
    await debit(blockedId(), 10300);
    await finishCash(0, await started());
    expect(await balance(blockedId())).toBe(-10500);
    // 10 % de la commission de 200.
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(20);
  });

  it('kasimanAccount et kasimanStatement : etat du compte et releve du grand livre', async () => {
    await debit(blockedId(), 10300);
    const orderId = await started();
    await finishCash(0, orderId);
    await settle(4000, 'k-6');
    const resolver = new KasimanAccountResolver(ds, {
      req: { user: { id: blockedId() } },
    } as never);

    expect(await resolver.kasimanAccount()).toEqual({
      currency: CURRENCY,
      balance: -6500,
      debt: 6500,
      debtLimit: 10000,
      debtAlertThreshold: 7500,
      level: DebtLevel.Ok,
      blocked: false,
      alert: false,
    });

    const statement = await resolver.kasimanStatement(undefined, 20, 0);
    expect(statement!.totalCount).toBe(3);
    const [settlement, course, correction] = statement!.items;
    expect(settlement).toMatchObject({
      nature: 'REGLEMENT_DETTE',
      settlement: 4000,
      amount: 4000,
      balanceAfter: -6500,
      reference: 'R-k-6',
    });
    expect(course).toMatchObject({
      nature: 'FIN_COURSE',
      requestId: orderId,
      orderPrice: 2000,
      cashCollected: 2000,
      commission: -200,
      onlinePaid: 0,
      amount: -200,
      balanceAfter: -10500,
    });
    expect(correction).toMatchObject({ nature: 'CORRECTION', other: -10300, balanceAfter: -10300 });
    const page2 = await resolver.kasimanStatement(CURRENCY, 2, 2);
    expect(page2!.items.map((i) => i.nature)).toEqual(['CORRECTION']);
    expect(page2!.totalCount).toBe(3);
    // Kasiman sans portefeuille : compte a zero dans la devise de la politique.
    const other = new KasimanAccountResolver(ds, { req: { user: { id: freeId() } } } as never);
    expect((await other.kasimanAccount())!.balance).toBe(0);
  });
});
