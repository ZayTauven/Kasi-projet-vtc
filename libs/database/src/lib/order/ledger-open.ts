import { DataSource, EntityManager } from 'typeorm';

import { LedgerEntryNature, LedgerLineNature } from '../entities/enums/ledger.enum';
import {
  accountOfWallet,
  allProjections,
  ensureLedgerAccount,
  insertLedgerEntry,
  insertLedgerLines,
  LedgerAccounts,
  roundFcfa,
} from './ledger';
import { MoneyKey, walletLockKey } from './wallet-ledger';

/**
 * p2-argent I2 (2026-10-19) : ouverture du grand livre (fiche §3.8), commande
 * ponctuelle `node migrate.js ledger-open` (npm run ledger:open sur le poste),
 * a lancer juste apres la migration LedgerTables, API arretees.
 *
 * Pour chaque compte de tiers (et KASI:PRODUITS), une ecriture OUVERTURE :
 * le compte recoit son solde de portefeuille arrondi au franc, KASI:OUVERTURE
 * l'oppose. Cle `opening:<compte>:<devise>` : relancer la commande ne fait
 * rien. Le portefeuille est aligne sur l'entier (sans ligne de portefeuille :
 * l'ecart est de moins d'un franc et n'est pas une operation). La somme des
 * ecarts d'arrondi, par devise, va sur KASI:ARRONDIS (contrepartie
 * KASI:OUVERTURE), arrondie au franc.
 *
 * Robustesse :
 * - verrou consultatif de session `kasi-ledger-open` : deux ouvertures
 *   simultanees s'attendent ;
 * - chaque compte sous le verrou consultatif de ses portefeuilles (le meme que
 *   postWalletOperation) et dans sa propre transaction ;
 * - montant d'ouverture = solde arrondi - lignes deja presentes sur le compte :
 *   si une API a deja ecrit au grand livre avant l'ouverture, rien n'est
 *   compte deux fois ;
 * - plusieurs portefeuilles pour un meme proprietaire et une meme devise
 *   (doublons historiques) : un seul compte, la somme des soldes.
 *
 * L'historique d'avant l'ouverture n'est pas reconstitue (fiche §3.8, 4.).
 */
export interface LedgerOpeningReport {
  /** Comptes examines (proprietaire + devise). */
  accounts: number;
  /** Ecritures d'ouverture creees par cette execution. */
  opened: number;
  /** Comptes deja ouverts (relance). */
  alreadyOpened: number;
  /** Portefeuilles dont le solde a ete aligne sur l'entier. */
  aligned: number;
  /** Par devise : somme des soldes repris et ecart d'arrondi cumule. */
  byCurrency: Record<string, { total: number; roundingGap: number; roundingEntry: number }>;
}

const OPEN_LOCK = 'kasi-ledger-open';

export async function openLedger(
  ds: DataSource,
  log: (message: string) => void = () => undefined,
): Promise<LedgerOpeningReport> {
  const runner = ds.createQueryRunner();
  await runner.connect();
  const report: LedgerOpeningReport = {
    accounts: 0,
    opened: 0,
    alreadyOpened: 0,
    aligned: 0,
    byCurrency: {},
  };
  try {
    await runner.query('SELECT pg_advisory_lock(hashtext($1))', [OPEN_LOCK]);
    let lastEntryId = 0;
    const gaps = new Map<string, number>();
    for (const projection of allProjections()) {
      const ownerSql = projection.ownerColumn == null ? 'NULL::int' : `"${projection.ownerColumn}"`;
      const groups: Array<{ ownerId: number | null; currency: string }> = await ds.query(
        `SELECT ${ownerSql} AS "ownerId", currency::text AS currency
           FROM "${projection.walletTable}"
          GROUP BY 1, 2 ORDER BY 1, 2`,
      );
      for (const group of groups) {
        report.accounts++;
        const outcome = await ds.transaction((manager) =>
          openAccount(manager, projection, group.ownerId, group.currency.trim()),
        );
        const currency = group.currency.trim();
        if (report.byCurrency[currency] == null) {
          report.byCurrency[currency] = { total: 0, roundingGap: 0, roundingEntry: 0 };
        }
        const stats = report.byCurrency[currency];
        if (outcome.entryId == null) {
          report.alreadyOpened++;
          continue;
        }
        report.opened++;
        report.aligned += outcome.aligned;
        stats.total += outcome.amount;
        lastEntryId = Math.max(lastEntryId, outcome.entryId);
        gaps.set(currency, (gaps.get(currency) ?? 0) + outcome.gap);
      }
    }
    for (const [currency, gap] of gaps) {
      const stats = report.byCurrency[currency];
      stats.roundingGap = Math.round(gap * 10000) / 10000;
      const amount = roundFcfa(gap);
      if (amount === 0) {
        continue;
      }
      // Kasi a donne `gap` aux portefeuilles en les alignant : charge sur
      // ARRONDIS, contrepartie OUVERTURE (qui retrouve ainsi, au franc pres,
      // l'oppose des soldes reels repris).
      await ds.transaction(async (manager) => {
        const entryId = await insertLedgerEntry(manager, {
          idempotencyKey: MoneyKey.opening(`KASI:ARRONDIS:${lastEntryId}`, currency),
          nature: LedgerEntryNature.Ouverture,
          currency,
          motif: `Ecart d'arrondi cumule de la reprise des portefeuilles : ${stats.roundingGap} ${currency}`,
          lines: [],
        });
        if (entryId != null) {
          await insertLedgerLines(manager, entryId, currency, [
            { account: LedgerAccounts.kasiArrondis(), amount: -amount, nature: LedgerLineNature.Arrondi },
            { account: LedgerAccounts.kasiOuverture(), amount, nature: LedgerLineNature.Arrondi },
          ]);
          stats.roundingEntry = -amount;
        }
      });
    }
    for (const [currency, stats] of Object.entries(report.byCurrency)) {
      log(
        `${currency} : soldes repris ${stats.total}, ecart d'arrondi ${stats.roundingGap}` +
          (stats.roundingEntry !== 0 ? ` (KASI:ARRONDIS ${stats.roundingEntry})` : ''),
      );
    }
    log(
      `${report.accounts} compte(s) examine(s) : ${report.opened} ouvert(s), ` +
        `${report.alreadyOpened} deja ouvert(s), ${report.aligned} portefeuille(s) aligne(s) sur l'entier`,
    );
    return report;
  } finally {
    await runner
      .query('SELECT pg_advisory_unlock(hashtext($1))', [OPEN_LOCK])
      .catch(() => undefined);
    await runner.release();
  }
}

async function openAccount(
  manager: EntityManager,
  projection: ReturnType<typeof allProjections>[number],
  ownerId: number | null,
  currency: string,
): Promise<{ entryId: number | null; amount: number; gap: number; aligned: number }> {
  const owner: Record<string, number> =
    projection.ownerColumn == null ? {} : { [projection.ownerColumn]: Number(ownerId) };
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    walletLockKey(projection.walletTable, owner, currency),
  ]);
  const ownerFilter =
    projection.ownerColumn == null ? 'TRUE' : `"${projection.ownerColumn}" = $2`;
  const wallets: Array<{ id: number; amount: number }> = await manager.query(
    `SELECT id, amount FROM "${projection.walletTable}"
      WHERE currency = $1 AND ${ownerFilter} ORDER BY id FOR UPDATE`,
    projection.ownerColumn == null ? [currency] : [currency, ownerId],
  );
  const account = accountOfWallet(projection.kind, ownerId);
  const entryId = await insertLedgerEntry(manager, {
    idempotencyKey: MoneyKey.opening(account.code, currency),
    nature: LedgerEntryNature.Ouverture,
    currency,
    reference: wallets.map((w) => `${projection.walletTable}#${w.id}`).join(',').slice(0, 255),
    motif:
      `Ouverture du grand livre : solde repris de ${projection.walletTable} ` +
      `(${wallets.map((w) => Number(w.amount)).join(' + ')})`,
    lines: [],
  });
  if (entryId == null) {
    return { entryId: null, amount: 0, gap: 0, aligned: 0 };
  }
  let rounded = 0;
  let gap = 0;
  let aligned = 0;
  for (const wallet of wallets) {
    const balance = Number(wallet.amount);
    const target = roundFcfa(balance);
    rounded += target;
    if (target !== balance) {
      gap += target - balance;
      aligned++;
      await manager.query(`UPDATE "${projection.walletTable}" SET amount = $1 WHERE id = $2`, [
        target,
        wallet.id,
      ]);
    }
  }
  const accountId = await ensureLedgerAccount(manager, account, currency);
  const [{ total }] = await manager.query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM "ledger_line" WHERE "accountId" = $1`,
    [accountId],
  );
  const amount = rounded - Number(total);
  await insertLedgerLines(manager, entryId, currency, [
    { account, amount, nature: LedgerLineNature.Ouverture },
    { account: LedgerAccounts.kasiOuverture(), amount: -amount, nature: LedgerLineNature.Ouverture },
  ]);
  return { entryId, amount, gap, aligned };
}
