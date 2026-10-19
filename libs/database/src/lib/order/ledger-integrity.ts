import { EntityManager } from 'typeorm';

import { LedgerEntryNature } from '../entities/enums/ledger.enum';
import { allProjections } from './ledger';

/**
 * p2-argent I2 (2026-10-19) : controle d'integrite du grand livre (fiche §3.9),
 * en LECTURE SEULE. Utilise par la requete `ledgerIntegrityReport`
 * d'admin-api, sa tache quotidienne, et `node migrate.js ledger-check`.
 *
 * Quatre controles :
 * - PROJECTION : pour chaque portefeuille (proprietaire + devise), solde =
 *   somme des lignes de son compte. Un portefeuille sans compte et a solde non
 *   nul (jamais ouvert) est un ecart ;
 * - UNLINKED_LINE : ligne de portefeuille sans ecriture (`ledgerEntryId` NULL)
 *   posterieure a l'ouverture (shadow : ecriture echouee) ;
 * - CURRENCY_TOTAL : somme de tous les comptes nulle, par devise ;
 * - UNBALANCED_ENTRY : ecriture dont les lignes ne somment pas a zero (le
 *   declencheur differe l'interdit : signale une alteration de la base).
 *
 * Un ecart ne se corrige jamais en touchant un solde : par une ecriture motivee.
 */
export type LedgerIntegrityIssueKind =
  | 'PROJECTION'
  | 'UNLINKED_LINE'
  | 'CURRENCY_TOTAL'
  | 'UNBALANCED_ENTRY';

export interface LedgerIntegrityIssue {
  kind: LedgerIntegrityIssueKind;
  account?: string;
  currency?: string;
  walletTable?: string;
  walletBalance?: number;
  ledgerBalance?: number;
  difference?: number;
  count?: number;
  detail: string;
}

export interface LedgerIntegrityReport {
  checkedAt: Date;
  /** Premiere ecriture d'ouverture (null : grand livre jamais ouvert). */
  openedAt: Date | null;
  entryCount: number;
  accountCount: number;
  walletCount: number;
  issues: LedgerIntegrityIssue[];
  ok: boolean;
}

/** Tolerance : les soldes de portefeuille sont des `float`. */
const EPSILON = 0.000001;
const MAX_ISSUES_PER_CHECK = 200;

export async function ledgerIntegrityReport(
  manager: EntityManager,
): Promise<LedgerIntegrityReport> {
  const issues: LedgerIntegrityIssue[] = [];
  const [{ entries, accounts, opened, first }] = await manager.query(
    `SELECT (SELECT count(*)::int FROM "ledger_entry") AS entries,
            (SELECT count(*)::int FROM "ledger_account") AS accounts,
            (SELECT min("createdAt") FROM "ledger_entry" WHERE "nature" = $1) AS opened,
            (SELECT min("createdAt") FROM "ledger_entry") AS first`,
    [LedgerEntryNature.Ouverture],
  );
  const openedAt: Date | null = opened ?? null;
  // Seuil des lignes non reliees : l'ouverture, a defaut la premiere ecriture
  // (base neuve, banc d'integration).
  const since: Date | null = opened ?? first ?? null;

  let walletCount = 0;
  for (const p of allProjections()) {
    const ownerSql = p.ownerColumn == null ? '0' : `COALESCE("${p.ownerColumn}", 0)`;
    const accountFilter =
      p.code != null ? `a."code" = '${p.code}'` : `a."kind" = '${p.kind}'`;
    const rows: Array<{
      ownerId: number;
      currency: string;
      wallets: number;
      balance: number;
      total: string;
      code: string | null;
    }> = await manager.query(
      `WITH w AS (
         SELECT ${ownerSql} AS "ownerId", currency::text AS currency,
                count(*)::int AS wallets, SUM(amount)::float8 AS balance
           FROM "${p.walletTable}" GROUP BY 1, 2
       ), l AS (
         SELECT COALESCE(a."ownerId", 0) AS "ownerId", a.currency::text AS currency,
                min(a."code") AS code, COALESCE(SUM(li.amount), 0)::text AS total
           FROM "ledger_account" a
           LEFT JOIN "ledger_line" li ON li."accountId" = a.id
          WHERE ${accountFilter}
          GROUP BY 1, 2
       )
       SELECT COALESCE(w."ownerId", l."ownerId") AS "ownerId",
              COALESCE(w.currency, l.currency) AS currency,
              COALESCE(w.wallets, 0) AS wallets,
              COALESCE(w.balance, 0) AS balance,
              COALESCE(l.total, '0') AS total,
              l.code
         FROM w FULL OUTER JOIN l
           ON l."ownerId" = w."ownerId" AND l.currency = w.currency`,
    );
    for (const row of rows) {
      walletCount += Number(row.wallets);
      const balance = Number(row.balance);
      const total = Number(row.total);
      const difference = Math.round((balance - total) * 10000) / 10000;
      if (Math.abs(balance - total) <= EPSILON) {
        continue;
      }
      if (issues.length >= MAX_ISSUES_PER_CHECK) {
        break;
      }
      const account =
        row.code ??
        (p.ownerColumn == null ? 'KASI:PRODUITS' : `${p.kind}:${row.ownerId}`);
      issues.push({
        kind: 'PROJECTION',
        account,
        currency: row.currency.trim(),
        walletTable: p.walletTable,
        walletBalance: balance,
        ledgerBalance: total,
        difference,
        detail:
          row.code == null
            ? `${p.walletTable} sans compte au grand livre (ouverture non faite ?) : solde ${balance}`
            : `${p.walletTable} : solde ${balance}, grand livre ${total}, ecart ${difference}`,
      });
    }
    if (since != null) {
      const [{ n }] = await manager.query(
        `SELECT count(*)::int AS n FROM "${p.transactionTable}"
          WHERE "ledgerEntryId" IS NULL AND "transactionTime" >= $1`,
        [since],
      );
      if (n > 0) {
        issues.push({
          kind: 'UNLINKED_LINE',
          walletTable: p.transactionTable,
          count: n,
          detail: `${n} ligne(s) de ${p.transactionTable} sans ecriture depuis le ${new Date(since).toISOString()}`,
        });
      }
    }
  }

  const totals: Array<{ currency: string; total: string }> = await manager.query(
    `SELECT a.currency::text AS currency, SUM(l.amount)::text AS total
       FROM "ledger_line" l JOIN "ledger_account" a ON a.id = l."accountId"
      GROUP BY 1 HAVING SUM(l.amount) <> 0`,
  );
  for (const row of totals) {
    issues.push({
      kind: 'CURRENCY_TOTAL',
      currency: row.currency.trim(),
      ledgerBalance: Number(row.total),
      detail: `somme des comptes en ${row.currency.trim()} : ${row.total} (attendu 0)`,
    });
  }

  const unbalanced: Array<{ entryId: number; total: string }> = await manager.query(
    `SELECT "entryId", SUM(amount)::text AS total FROM "ledger_line"
      GROUP BY 1 HAVING SUM(amount) <> 0 ORDER BY 1 LIMIT ${MAX_ISSUES_PER_CHECK}`,
  );
  for (const row of unbalanced) {
    issues.push({
      kind: 'UNBALANCED_ENTRY',
      ledgerBalance: Number(row.total),
      detail: `ecriture ${row.entryId} desequilibree : somme ${row.total}`,
    });
  }

  return {
    checkedAt: new Date(),
    openedAt,
    entryCount: Number(entries),
    accountCount: Number(accounts),
    walletCount,
    issues,
    ok: issues.length === 0,
  };
}

/** Resume d'une ligne pour le journal (tache quotidienne, ledger-check). */
export function describeIntegrity(report: LedgerIntegrityReport): string {
  if (report.ok) {
    return (
      `grand livre integre : ${report.entryCount} ecriture(s), ${report.accountCount} compte(s), ` +
      `${report.walletCount} portefeuille(s), aucun ecart`
    );
  }
  return (
    `grand livre : ${report.issues.length} ecart(s) : ` +
    report.issues
      .slice(0, 10)
      .map((i) => `[${i.kind}] ${i.detail}`)
      .join(' ; ')
  );
}
