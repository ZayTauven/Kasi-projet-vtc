import { EntityManager } from 'typeorm';

import { LedgerAccounts } from './ledger';

/**
 * p2-argent I3 (2026-10-19) : releve du Kasiman (fiche argent §6.2, requete
 * `kasimanStatement` de driver-api), lu dans le grand livre.
 *
 * Une ligne par ecriture touchant le compte KASIMAN:<id> dans la devise, de
 * la plus recente a la plus ancienne. Montants SIGNES du point de vue du
 * Kasiman (positif = il recoit, negatif = il doit) : commission negative,
 * part payee en ligne, pourboire et reglement positifs. `balanceAfter` :
 * somme cumulee du compte (ouverture comprise) apres l'ecriture.
 *
 * Le releve commence a l'ouverture du grand livre ; l'historique d'avant
 * reste celui des lignes de portefeuille (`driverTransacions`).
 */
export interface KasimanStatementLine {
  entryId: number;
  createdAt: Date;
  nature: string;
  requestId: number | null;
  /**
   * Prix de la course pour le Kasiman : `costAfterCoupon` + remise financee
   * par Kasi (p2-argent I4, decision §8.6), pour une ecriture de course.
   */
  orderPrice: number | null;
  /** Especes encaissees par le Kasiman (fin de course). */
  cashCollected: number | null;
  /**
   * Part payee en ligne creditee au Kasiman : portefeuille du client, et
   * remise du coupon financee par Kasi (ligne PROMOTION, I4).
   */
  onlinePaid: number;
  commission: number;
  tip: number;
  addedStop: number;
  settlement: number;
  /** Autres lignes (annulation, correction, versement, ouverture...). */
  other: number;
  /** Mouvement net sur le compte du Kasiman. */
  amount: number;
  balanceAfter: number;
  reference: string | null;
  motif: string | null;
}

export interface KasimanStatementPage {
  currency: string;
  totalCount: number;
  items: KasimanStatementLine[];
}

const num = (value: unknown): number => (value == null ? 0 : Number(value));
const numOrNull = (value: unknown): number | null => (value == null ? null : Number(value));

export async function kasimanStatement(
  manager: EntityManager,
  driverId: number,
  currency: string,
  limit = 20,
  offset = 0,
): Promise<KasimanStatementPage> {
  const take = Math.min(Math.max(1, Math.floor(Number(limit) || 20)), 100);
  const skip = Math.max(0, Math.floor(Number(offset) || 0));
  const rows: Array<Record<string, unknown>> = await manager.query(
    `WITH acc AS (
       SELECT "id" FROM "ledger_account" WHERE "code" = $1 AND "currency" = $2
     ), per_entry AS (
       SELECT e."id", e."createdAt", e."nature", e."requestId", e."reference", e."motif",
              e."cashCollected",
              SUM(l."amount") AS "amount",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" IN ('PRIX', 'PROMOTION')), 0) AS "onlinePaid",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" = 'PROMOTION'), 0) AS "promotion",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" = 'COMMISSION'), 0) AS "commission",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" = 'POURBOIRE'), 0) AS "tip",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" = 'ARRET_AJOUTE'), 0) AS "addedStop",
              COALESCE(SUM(l."amount") FILTER (WHERE l."nature" = 'REGLEMENT'), 0) AS "settlement"
         FROM "ledger_line" l
         JOIN "ledger_entry" e ON e."id" = l."entryId"
        WHERE l."accountId" IN (SELECT "id" FROM acc)
        GROUP BY e."id"
     )
     SELECT p.*, r."costAfterCoupon" + p."promotion" AS "orderPrice",
            SUM(p."amount") OVER (ORDER BY p."id") AS "balanceAfter",
            COUNT(*) OVER () AS "totalCount"
       FROM per_entry p
       LEFT JOIN "request" r ON r."id" = p."requestId"
      ORDER BY p."id" DESC
      LIMIT $3 OFFSET $4`,
    [LedgerAccounts.kasiman(driverId).code, currency, take, skip],
  );
  let totalCount = num(rows[0]?.['totalCount']);
  if (rows.length === 0 && skip > 0) {
    const [{ count }] = await manager.query(
      `SELECT COUNT(DISTINCT l."entryId") AS "count"
         FROM "ledger_line" l JOIN "ledger_account" a ON a."id" = l."accountId"
        WHERE a."code" = $1 AND a."currency" = $2`,
      [LedgerAccounts.kasiman(driverId).code, currency],
    );
    totalCount = num(count);
  }
  return {
    currency,
    totalCount,
    items: rows.map((row) => {
      const amount = num(row['amount']);
      const onlinePaid = num(row['onlinePaid']);
      const commission = num(row['commission']);
      const tip = num(row['tip']);
      const addedStop = num(row['addedStop']);
      const settlement = num(row['settlement']);
      return {
        entryId: num(row['id']),
        createdAt: row['createdAt'] as Date,
        nature: String(row['nature']),
        requestId: numOrNull(row['requestId']),
        orderPrice: numOrNull(row['orderPrice']),
        cashCollected: numOrNull(row['cashCollected']),
        onlinePaid,
        commission,
        tip,
        addedStop,
        settlement,
        other: amount - onlinePaid - commission - tip - addedStop - settlement,
        amount,
        balanceAfter: num(row['balanceAfter']),
        reference: (row['reference'] as string | null) ?? null,
        motif: (row['motif'] as string | null) ?? null,
      };
    }),
  };
}
