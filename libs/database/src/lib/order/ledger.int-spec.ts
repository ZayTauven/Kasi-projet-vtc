/**
 * p2-argent I2 (2026-10-19) : grand livre en partie double, contre
 * PostgreSQL reel (docs/fiche-conception-argent.md §3 et §7 « I2 »).
 *
 *   npm run test:integration -- ledger
 *
 * Le banc tourne en LEDGER_MODE=strict (tools/test-integration/env.ts) : une
 * ecriture refusee fait echouer l'operation, donc le test.
 */
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  buildAdminApi,
  buildDriverApi,
  buildRiderApi,
  concurrently,
  countRows,
  createOperator,
  createOrder,
  createWorld,
  Doubles,
  errorOf,
  fakeReply,
  integrity,
  ledgerBalance,
  ledgerEntries,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  resetDatabase,
  walletBalance,
  World,
} from '../../../../../tools/test-integration/harness';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import { RiderRechargeTransactionType } from '../entities/enums/rider-recharge-transaction-type.enum';
import { DriverRechargeTransactionType } from '../entities/enums/driver-recharge-transaction-type.enum';
import {
  DEFAULT_MANUAL_MOTIF,
  LedgerAccounts,
  LedgerEntryNature,
  LedgerLineNature,
  ManualCounterparty,
  postLedgerEntry,
  roundFcfa,
  splitCommission,
} from './ledger';
import { openLedger } from './ledger-open';

const WALLET_LINE_TABLES = [
  'driver_transaction',
  'rider_transaction',
  'fleet_transaction',
  'admin_transaction',
];

describe('p2-argent I2 : grand livre en partie double', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let operatorId: number;
  const driverApi = (i = 0) => buildDriverApi(ds, redis, d, world.driverIds[i]);
  const riderApi = () => buildRiderApi(ds, redis, d);
  const admin = () => buildAdminApi(ds, redis, d, operatorId);

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
    await dropSimulatedFailure();
  });
  afterAll(async () => {
    await dropSimulatedFailure();
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });
  beforeEach(async () => {
    process.env.LEDGER_MODE = 'strict';
    await resetDatabase(ds, redis);
    d = makeDoubles();
    world = await createWorld(ds, {
      drivers: 2,
      providerSharePercent: 10,
      firstDriverInFleet: true,
      cancellationTotalFee: 500,
      cancellationDriverShare: 300,
    });
    operatorId = await createOperator(
      ds,
      ['DriverWallet_Edit', 'RiderWallet_Edit', 'FleetWallet_Edit', 'ProviderWallet_View'],
      'operateur-grand-livre',
    );
  });

  async function dropSimulatedFailure(): Promise<void> {
    await ds.query(`DROP TRIGGER IF EXISTS test_ledger_panne ON ledger_line`);
    await ds.query(`DROP FUNCTION IF EXISTS test_ledger_panne()`);
  }

  /** Retour de passerelle (stub CryptoService : JSON en clair). */
  async function gatewayCredit(
    userType: 'client' | 'driver',
    userId: number,
    ref: string,
    amount: number,
  ): Promise<void> {
    const token = JSON.stringify({
      userType,
      userId,
      status: 'success',
      amount,
      currency: 'XOF',
      transactionNumber: ref,
      gatewayId: world.gatewayId,
    });
    if (userType === 'client') {
      await riderApi().controller.verifyPayment(
        { query: { token } } as never,
        fakeReply() as never,
      );
    } else {
      await driverApi(0).controller.verifyPayment(
        { query: { token } } as never,
        fakeReply() as never,
      );
    }
  }

  const startedOrder = (driverIndex: number, cost: number, tipAmount = 0) =>
    createOrder(ds, world, {
      status: OrderStatus.Started,
      driverId: world.driverIds[driverIndex],
      cost,
      tipAmount,
    });

  async function unlinkedWalletLines(): Promise<number> {
    let n = 0;
    for (const table of WALLET_LINE_TABLES) {
      n += await countRows(ds, table, `"ledgerEntryId" IS NULL`);
    }
    return n;
  }

  // -------------------------------------------------------------------------
  // Garde-fous dans la base
  // -------------------------------------------------------------------------

  it('ecriture desequilibree : refusee PAR LA BASE a la validation (declencheur differe)', async () => {
    const runner = ds.createQueryRunner();
    await runner.connect();
    let error: string | null = null;
    try {
      await runner.startTransaction();
      const [{ id: accountId }] = await runner.query(
        `INSERT INTO ledger_account (code, kind, currency) VALUES ('KASI:TEST', 'KASI', 'XOF') RETURNING id`,
      );
      const [{ id: entryId }] = await runner.query(
        `INSERT INTO ledger_entry ("idempotencyKey", nature, currency)
         VALUES ('test:desequilibre', 'CORRECTION', 'XOF') RETURNING id`,
      );
      // L'insertion passe : le controle est differe a la validation.
      await runner.query(
        `INSERT INTO ledger_line ("entryId", "accountId", amount, nature) VALUES ($1, $2, 100, 'CORRECTION')`,
        [entryId, accountId],
      );
      error = await errorOf(runner.commitTransaction());
    } finally {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction().catch(() => undefined);
      }
      await runner.release();
    }
    expect(error).toContain('LEDGER_ENTRY_UNBALANCED');
    expect(await countRows(ds, 'ledger_entry')).toBe(0);
    expect(await countRows(ds, 'ledger_line')).toBe(0);

    // Devise : une ligne sur un compte d'une autre devise est refusee aussi.
    const mixed = await errorOf(
      ds.transaction(async (m) => {
        const [{ id: xof }] = await m.query(
          `INSERT INTO ledger_account (code, kind, currency) VALUES ('KASI:A', 'KASI', 'XOF') RETURNING id`,
        );
        const [{ id: eur }] = await m.query(
          `INSERT INTO ledger_account (code, kind, currency) VALUES ('KASI:B', 'KASI', 'EUR') RETURNING id`,
        );
        const [{ id: entryId }] = await m.query(
          `INSERT INTO ledger_entry ("idempotencyKey", nature, currency)
           VALUES ('test:devise', 'CORRECTION', 'XOF') RETURNING id`,
        );
        await m.query(
          `INSERT INTO ledger_line ("entryId", "accountId", amount, nature)
           VALUES ($1, $2, 100, 'CORRECTION'), ($1, $3, -100, 'CORRECTION')`,
          [entryId, xof, eur],
        );
      }),
    );
    expect(mixed).toContain('LEDGER_ENTRY_CURRENCY_MISMATCH');

    // Par le code (strict) : refusee avant meme d'atteindre la base, rien d'ecrit.
    const viaCode = await errorOf(
      postLedgerEntry(ds.manager, {
        idempotencyKey: 'test:desequilibre-code',
        nature: LedgerEntryNature.Correction,
        currency: 'XOF',
        lines: [
          {
            account: LedgerAccounts.client(world.riderId),
            amount: 100,
            nature: LedgerLineNature.Correction,
          },
        ],
        walletLines: [
          { account: LedgerAccounts.client(world.riderId), amount: 100, fields: {} },
        ],
      }),
    );
    expect(viaCode).toContain('LEDGER_ENTRY_UNBALANCED');
    expect(await countRows(ds, 'ledger_entry')).toBe(0);
    expect(await countRows(ds, 'rider_transaction')).toBe(0);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBeNull();
  });

  it('UPDATE et DELETE refuses sur ledger_entry et ledger_line', async () => {
    await gatewayCredit('client', world.riderId, 'WAVE-IMMUABLE', 5000);
    expect(await countRows(ds, 'ledger_entry')).toBe(1);
    expect(await countRows(ds, 'ledger_line')).toBe(2);
    for (const sql of [
      `UPDATE ledger_line SET amount = amount + 1`,
      `DELETE FROM ledger_line`,
      `UPDATE ledger_entry SET motif = 'modifie'`,
      `DELETE FROM ledger_entry`,
    ]) {
      expect(await errorOf(ds.query(sql))).toContain('LEDGER_IMMUTABLE');
    }
    expect(await countRows(ds, 'ledger_entry')).toBe(1);
    expect(await ledgerBalance(ds, LedgerAccounts.client(world.riderId).code)).toBe(5000);
    expect(await ledgerBalance(ds, `PASSERELLE:${world.gatewayId}`)).toBe(-5000);
  });

  // -------------------------------------------------------------------------
  // Unicite
  // -------------------------------------------------------------------------

  it('meme cle rejouee en serie puis en parallele : une seule ecriture, un seul mouvement', async () => {
    const credit = () =>
      admin().riderResolver.createRiderTransaction({
        riderId: world.riderId,
        action: TransactionAction.Recharge,
        rechargeType: RiderRechargeTransactionType.Correction,
        amount: 1500,
        currency: 'XOF',
        idempotencyKey: 'form-grand-livre',
      } as never);
    await credit();
    await credit();
    await credit();
    const results = await concurrently(8, credit);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const entries = await ledgerEntries(ds);
    expect(entries).toHaveLength(1);
    expect(entries[0].idempotencyKey).toBe('operator:form-grand-livre');
    expect(await countRows(ds, 'ledger_line')).toBe(2);
    expect(await countRows(ds, 'rider_transaction')).toBe(1);
    const [row] = await ds.query(`SELECT "ledgerEntryId" FROM rider_transaction`);
    expect(row.ledgerEntryId).toBe(entries[0].id);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(1500);
    expect(await ledgerBalance(ds, 'KASI:CORRECTIONS')).toBe(-1500);

    // Fin de course rejouee 6 fois en meme temps : une ecriture order:<id>:finish.
    const orderId = await startedOrder(1, 2000);
    const fin = await concurrently(6, () =>
      driverApi(1).update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 }),
    );
    expect(fin.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await ledgerEntries(ds, `"idempotencyKey" = $1`, [`order:${orderId}:finish`])).toHaveLength(1);
    expect((await integrity(ds)).ok).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Operations reelles, puis balayage d'integrite
  // -------------------------------------------------------------------------

  it('50 operations (especes, portefeuille, mixte, annulation, recharge, versement) : balayage a zero ecart', async () => {
    await gatewayCredit('client', world.riderId, 'WAVE-INIT', 200000);
    const kinds = { cash: 0, wallet: 0, mixed: 0, cancel: 0, recharge: 0, payout: 0, manual: 0 };
    const methods = ['Wave', 'OrangeMoney', 'Cash', 'BankTransfer'];
    for (let i = 0; i < 50; i++) {
      const driverIndex = i % 2;
      const driverId = world.driverIds[driverIndex];
      // Un prix sur quatre a des decimales (A6) : l'arrondi au franc s'applique.
      const cost = 1000 + 125 * i + (i % 4 === 0 ? 0.5 : 0);
      const tip = i % 5 === 0 ? 200 : 0;
      switch (i % 6) {
        case 0: {
          const orderId = await startedOrder(driverIndex, cost, tip);
          await driverApi(driverIndex).update(orderId, {
            status: OrderStatus.Finished,
            paidAmount: cost + tip,
          });
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
          kinds.cash++;
          break;
        }
        case 1: {
          const orderId = await startedOrder(driverIndex, cost, tip);
          await driverApi(driverIndex).update(orderId, { status: OrderStatus.Finished });
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
          kinds.wallet++;
          break;
        }
        case 2: {
          const orderId = await startedOrder(driverIndex, cost, tip);
          await driverApi(driverIndex).update(orderId, {
            status: OrderStatus.Finished,
            paidAmount: 500,
          });
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
          kinds.mixed++;
          break;
        }
        case 3: {
          const orderId = await createOrder(ds, world, {
            status: OrderStatus.DriverAccepted,
            driverId,
            cost,
          });
          await riderApi().update(orderId, world.riderId, {
            status: OrderStatus.RiderCanceled,
            waitMinutes: 0,
            tipAmount: 0,
          });
          expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.RiderCanceled);
          kinds.cancel++;
          break;
        }
        case 4: {
          if (i % 12 === 4) {
            await gatewayCredit('client', world.riderId, `WAVE-${i}`, 1000 + i);
          } else {
            await gatewayCredit('driver', world.driverIds[0], `OM-${i}`, 1000 + i);
          }
          kinds.recharge++;
          break;
        }
        case 5: {
          const balance =
            (await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[1] })) ?? 0;
          if (balance >= 1000) {
            const [{ id: sessionId }] = await ds.query(
              `INSERT INTO payout_session (currency) VALUES ('XOF') RETURNING id`,
            );
            const method = methods[kinds.payout % methods.length];
            const [{ id: payoutId }] = await ds.query(
              `INSERT INTO payout ("sessionId", "driverId", amount, currency, "methodType", "methodName")
               VALUES ($1, $2, 1000, 'XOF', $3, $4) RETURNING id`,
              [sessionId, world.driverIds[1], method, method],
            );
            await admin().payoutService.processPayout(payoutId, operatorId);
            kinds.payout++;
          } else {
            await admin().driverResolver.createDriverTransaction({
              driverId: world.driverIds[1],
              action: TransactionAction.Recharge,
              rechargeType: DriverRechargeTransactionType.BankTransfer,
              amount: 3000,
              currency: 'XOF',
              counterparty: ManualCounterparty.Caisse,
              motif: 'Depot au siege',
            } as never);
            kinds.manual++;
          }
          break;
        }
      }
    }
    expect(kinds.cash + kinds.wallet + kinds.mixed).toBeGreaterThanOrEqual(25);
    expect(kinds.cancel).toBeGreaterThanOrEqual(8);
    expect(kinds.payout).toBeGreaterThanOrEqual(2);

    const report = await integrity(ds);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(await unlinkedWalletLines()).toBe(0);
    // Chaque portefeuille = son compte, et les montants sont entiers.
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(
      await ledgerBalance(ds, `FLOTTE:${world.fleetId}`),
    );
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(
      await ledgerBalance(ds, 'KASI:PRODUITS'),
    );
    const [{ n: fractional }] = await ds.query(
      `SELECT (SELECT count(*) FROM driver_transaction WHERE amount <> round(amount))
            + (SELECT count(*) FROM rider_transaction WHERE amount <> round(amount))
            + (SELECT count(*) FROM fleet_transaction WHERE amount <> round(amount))
            + (SELECT count(*) FROM admin_transaction WHERE amount <> round(amount)) AS n`,
    );
    expect(Number(fractional)).toBe(0);
    // Contreparties : passerelle, tresorerie, caisse.
    expect(await ledgerBalance(ds, `PASSERELLE:${world.gatewayId}`)).toBeLessThan(-200000);
    expect(await ledgerBalance(ds, 'TRESORERIE:WAVE')).toBeGreaterThan(0);
    // Requete GraphQL d'admin-api (meme fonction).
    const viaApi = await admin().ledgerResolver.ledgerIntegrityReport();
    expect(viaApi.ok).toBe(true);
    expect(viaApi.issueCount).toBe(0);
    expect(viaApi.entryCount).toBe(await countRows(ds, 'ledger_entry'));
  });

  it('ledgerIntegrityReport : operateur sans ProviderWallet_View refuse', async () => {
    const viewer = await createOperator(ds, ['DriverWallet_View'], 'sans-compta');
    expect(
      await errorOf(buildAdminApi(ds, redis, d, viewer).ledgerResolver.ledgerIntegrityReport()),
    ).toBe('PERMISSION_NOT_GRANTED');
  });

  it('10 fins de course simultanees pour un meme Kasiman : 10 ecritures, comptes justes', async () => {
    await gatewayCredit('client', world.riderId, 'WAVE-10', 100000);
    const orders: number[] = [];
    for (let i = 0; i < 10; i++) {
      orders.push(await startedOrder(0, 2000));
    }
    const results = await concurrently(10, (i) =>
      driverApi(0).update(orders[i], { status: OrderStatus.Finished }),
    );
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
    for (const orderId of orders) {
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
    }
    expect(await ledgerEntries(ds, `nature = 'FIN_COURSE'`)).toHaveLength(10);
    // 10 x (2 000 - 200 de commission) ; flotte 10 % de la commission.
    expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] })).toBe(18000);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(80000);
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(200);
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(1800);
    expect((await integrity(ds)).ok).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Ouverture
  // -------------------------------------------------------------------------

  it('ouverture lancee deux fois (dont deux en meme temps) : une seule ecriture par compte, soldes alignes', async () => {
    // Soldes d'avant le grand livre, dont des decimales (A6).
    await ds.query(
      `INSERT INTO driver_wallet (amount, currency, "driverId") VALUES (100.5, 'XOF', $1)`,
      [world.driverIds[0]],
    );
    await ds.query(
      `INSERT INTO rider_wallet (amount, currency, "riderId") VALUES (200.6, 'XOF', $1)`,
      [world.riderId],
    );
    await ds.query(
      `INSERT INTO fleet_wallet (amount, currency, "fleetId") VALUES (10.7, 'XOF', $1)`,
      [world.fleetId],
    );
    await ds.query(`INSERT INTO admin_wallet (amount, currency) VALUES (41846.3452, 'XOF')`);
    const before = await integrity(ds);
    expect(before.ok).toBe(false);
    expect(before.issues.filter((i) => i.kind === 'PROJECTION')).toHaveLength(4);

    const [first, second] = await Promise.all([openLedger(ds), openLedger(ds)]);
    expect(first.opened + second.opened).toBe(4);
    const third = await openLedger(ds);
    expect(third.opened).toBe(0);
    expect(third.alreadyOpened).toBe(4);

    // 4 ouvertures + 1 ecart d'arrondi cumule (0,5 + 0,4 + 0,3 - 0,3452 = 0,8548 -> 1).
    const openings = await ledgerEntries(ds, `nature = 'OUVERTURE'`);
    expect(openings).toHaveLength(5);
    expect(openings.map((e) => e.idempotencyKey)).toEqual(
      expect.arrayContaining([
        `opening:KASIMAN:${world.driverIds[0]}:XOF`,
        `opening:CLIENT:${world.riderId}:XOF`,
        `opening:FLOTTE:${world.fleetId}:XOF`,
        'opening:KASI:PRODUITS:XOF',
      ]),
    );
    expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] })).toBe(101);
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(201);
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(11);
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(41846);
    expect(await ledgerBalance(ds, 'KASI:ARRONDIS')).toBe(-1);
    expect(await ledgerBalance(ds, 'KASI:OUVERTURE')).toBe(-(101 + 201 + 11 + 41846) + 1);
    expect((await integrity(ds)).ok).toBe(true);

    // Apres l'ouverture, les operations suivent le grand livre.
    const orderId = await startedOrder(0, 2000);
    await driverApi(0).update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 });
    const after = await integrity(ds);
    expect(after.issues).toEqual([]);
    expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[0] })).toBe(-99);
  });

  // -------------------------------------------------------------------------
  // Arrondis (fiche §3.5)
  // -------------------------------------------------------------------------

  it('arrondis : commission de 187,5 -> 188, part de flotte + part Kasi = commission', async () => {
    expect(roundFcfa(187.5)).toBe(188);
    expect(roundFcfa(0.15 * 1250)).toBe(188); // 187,49999999999997 en flottant
    expect(roundFcfa(187.49)).toBe(187);
    expect(splitCommission(187.5, { commissionSharePercent: 10, commissionShareFlat: 0 })).toEqual({
      commission: 188,
      fleetShare: 19,
      kasiShare: 169,
    });

    await ds.query(`UPDATE service SET "providerSharePercent" = 15`);
    const orderId = await startedOrder(0, 1250);
    await driverApi(0).update(orderId, { status: OrderStatus.Finished, paidAmount: 1250 });
    const [driverLine] = await ds.query(
      `SELECT amount::float AS amount FROM driver_transaction WHERE "requestId" = $1 AND "deductType" = 'Commission'`,
      [orderId],
    );
    expect(driverLine.amount).toBe(-188);
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(19);
    expect(await walletBalance(ds, 'admin_wallet', {})).toBe(169);
    expect(await ledgerBalance(ds, `KASIMAN:${world.driverIds[0]}`)).toBe(-188);
    const [entry] = await ledgerEntries(ds, `"idempotencyKey" = $1`, [`order:${orderId}:finish`]);
    const lines: Array<{ code: string; amount: string; nature: string }> = await ds.query(
      `SELECT a.code, l.amount::text AS amount, l.nature
         FROM ledger_line l JOIN ledger_account a ON a.id = l."accountId"
        WHERE l."entryId" = $1 ORDER BY l.id`,
      [entry.id],
    );
    expect(lines.map((l) => [l.code, Number(l.amount), l.nature])).toEqual([
      [`KASIMAN:${world.driverIds[0]}`, -188, 'COMMISSION'],
      ['KASI:PRODUITS', 169, 'COMMISSION'],
      [`FLOTTE:${world.fleetId}`, 19, 'PART_FLOTTE'],
    ]);

    // Prix a decimales paye par le portefeuille : montant arrondi au franc,
    // pourboire en ligne POURBOIRE distincte au grand livre.
    await gatewayCredit('client', world.riderId, 'WAVE-ARRONDI', 10000);
    const walletOrder = await startedOrder(1, 1250.5, 100);
    await driverApi(1).update(walletOrder, { status: OrderStatus.Finished });
    expect(await walletBalance(ds, 'rider_wallet', { riderId: world.riderId })).toBe(
      10000 - 1351,
    );
    // 1 351 credites, commission 15 % de 1 250,5 = 187,575 -> 188.
    expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[1] })).toBe(
      1351 - 188,
    );
    const [walletEntry] = await ledgerEntries(ds, `"idempotencyKey" = $1`, [
      `order:${walletOrder}:finish`,
    ]);
    const [{ tip }] = await ds.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS tip FROM ledger_line
        WHERE "entryId" = $1 AND nature = 'POURBOIRE' AND amount > 0`,
      [walletEntry.id],
    );
    expect(tip).toBe(100);
    expect((await integrity(ds)).ok).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Operations manuelles : contrepartie et motif par defaut
  // -------------------------------------------------------------------------

  it('operation manuelle sans contrepartie ni motif : KASI:CORRECTIONS, motif par defaut, cle operator-auto', async () => {
    await admin().riderResolver.createRiderTransaction({
      riderId: world.riderId,
      action: TransactionAction.Recharge,
      rechargeType: RiderRechargeTransactionType.Correction,
      amount: 1500,
      currency: 'XOF',
    } as never);
    const [entry] = await ledgerEntries(ds);
    expect(entry.nature).toBe('CORRECTION');
    expect(entry.motif).toBe(DEFAULT_MANUAL_MOTIF);
    expect(entry.idempotencyKey).toMatch(/^operator-auto:/);
    expect(await ledgerBalance(ds, 'KASI:CORRECTIONS')).toBe(-1500);
    const [row] = await ds.query(`SELECT "idempotencyKey" FROM rider_transaction`);
    expect(row.idempotencyKey).toBeNull();

    await admin().fleetResolver.createFleetTransaction({
      fleetId: world.fleetId,
      action: TransactionAction.Deduct,
      rechargeType: 'Commission',
      amount: 700,
      currency: 'XOF',
      counterparty: ManualCounterparty.Promotions,
      description: 'Geste commercial',
    } as never);
    const [, fleetEntry] = await ledgerEntries(ds);
    expect(fleetEntry.motif).toBe('Geste commercial');
    expect(await ledgerBalance(ds, 'KASI:PROMOTIONS')).toBe(700);
    expect(await walletBalance(ds, 'fleet_wallet', { fleetId: world.fleetId })).toBe(-700);
    expect((await integrity(ds)).ok).toBe(true);
  });

  // -------------------------------------------------------------------------
  // LEDGER_MODE
  // -------------------------------------------------------------------------

  it('mode shadow : une panne du grand livre n empeche pas la fin de course ; en strict, elle l annule', async () => {
    await ds.query(`
      CREATE FUNCTION test_ledger_panne() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'PANNE_SIMULEE du grand livre'; END $$`);
    await ds.query(`
      CREATE TRIGGER test_ledger_panne BEFORE INSERT ON ledger_line
      FOR EACH ROW EXECUTE FUNCTION test_ledger_panne()`);
    try {
      process.env.LEDGER_MODE = 'shadow';
      const orderId = await startedOrder(1, 2000);
      await driverApi(1).update(orderId, { status: OrderStatus.Finished, paidAmount: 2000 });
      expect((await orderRow(ds, orderId)).status).toBe(OrderStatus.WaitingForReview);
      expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[1] })).toBe(-200);
      expect(await walletBalance(ds, 'admin_wallet', {})).toBe(200);
      expect(await countRows(ds, 'ledger_entry')).toBe(0);
      expect(await unlinkedWalletLines()).toBe(2);
      // L'ecart est vu par le controle d'integrite.
      const report = await integrity(ds);
      expect(report.ok).toBe(false);
      expect(report.issues.some((i) => i.kind === 'PROJECTION')).toBe(true);

      process.env.LEDGER_MODE = 'strict';
      const strictOrder = await startedOrder(1, 2000);
      const error = await errorOf(
        driverApi(1).update(strictOrder, { status: OrderStatus.Finished, paidAmount: 2000 }),
      );
      expect(error).toContain('PANNE_SIMULEE');
      expect((await orderRow(ds, strictOrder)).status).toBe(OrderStatus.Started);
      expect(
        await countRows(ds, 'driver_transaction', `"requestId" = $1`, [strictOrder]),
      ).toBe(0);
      expect(await walletBalance(ds, 'driver_wallet', { driverId: world.driverIds[1] })).toBe(-200);
    } finally {
      process.env.LEDGER_MODE = 'strict';
      await dropSimulatedFailure();
    }
  });

  // -------------------------------------------------------------------------
  // Seul point d'entree
  // -------------------------------------------------------------------------

  it('aucun appel direct a rechargeWallet ni a postWalletOperation hors de postLedgerEntry', () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
    const dirs = ['apps/admin-api/src', 'apps/driver-api/src', 'apps/rider-api/src', 'libs'];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'dist') {
            walk(full);
          }
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.spec.ts') &&
          !entry.name.endsWith('.int-spec.ts')
        ) {
          files.push(full);
        }
      }
    };
    for (const dir of dirs) {
      walk(path.join(root, dir));
    }
    expect(files.length).toBeGreaterThan(100);
    const call = /\b(rechargeWallet|postWalletOperation)\s*(<[^>()]*>)?\s*\(/g;
    const found: string[] = [];
    for (const file of files) {
      const code = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      for (const match of code.matchAll(call)) {
        found.push(`${path.relative(root, file).replace(/\\/g, '/')}:${match[1]}`);
      }
    }
    // Definition (et sa reprise en transaction) dans wallet-ledger.ts ; un seul
    // appel, dans ledger.ts (postLedgerEntry).
    expect(found.sort()).toEqual([
      'libs/database/src/lib/order/ledger.ts:postWalletOperation',
      'libs/database/src/lib/order/wallet-ledger.ts:postWalletOperation',
      'libs/database/src/lib/order/wallet-ledger.ts:postWalletOperation',
    ]);
  });
});
