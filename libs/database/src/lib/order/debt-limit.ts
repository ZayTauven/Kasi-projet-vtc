import { GraphQLError } from 'graphql';
import { EntityManager } from 'typeorm';

import { DriverRechargeTransactionType } from '../entities/enums/driver-recharge-transaction-type.enum';
import { LedgerEntryNature, LedgerLineNature } from '../entities/enums/ledger.enum';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import { TransactionStatus } from '../entities/enums/transaction-status.enum';
import { LedgerAccounts, LedgerPostResult, postLedgerEntry } from './ledger';
import { walletLockKey } from './wallet-ledger';

/**
 * p2-argent I3 (2026-10-19) : dette especes du Kasiman et plafond
 * (docs/fiche-conception-argent.md §4).
 *
 * - Dette = partie negative du solde du portefeuille du Kasiman (colonne
 *   `amount` de `driver_wallet`, propriete `balance`)
 *   (`driver_wallet`, projection du compte KASIMAN:<id>), par devise. Les
 *   gains payes en ligne la reduisent d'eux-memes.
 * - Plafond et seuil d'alerte : table `money_policy`, une ligne par devise,
 *   relue a chaque appel (reglable sans deploiement, deblocage immediat).
 *   Pas de ligne : pas de plafond dans cette devise.
 * - Bloque au-dela du plafond (dette > debtLimit) ; alerte a partir du seuil
 *   (dette >= debtAlertThreshold).
 *
 * Une seule regle, lue par les quatre endroits de la fiche §4.2 : choix des
 * Kasimen prevenus (SharedDriverService.getOnlineDriversWithServiceId), offres
 * en attente (driver-api OrderService.getOrdersForDriver), acceptation
 * (DriverOrderQueryService.accept, le seul controle qui fait foi), et
 * attribution par l'operateur (permise : choix humain, aucun filtre). Le
 * futur dispatcher par vagues (p2-dispatch) filtrera ses candidats avec
 * `blockedForDebtDriverIds`.
 */

export const KASIMAN_DEBT_LIMIT = 'KASIMAN_DEBT_LIMIT';

export interface MoneyPolicy {
  currency: string;
  debtLimit: number;
  debtAlertThreshold: number;
}

export enum DebtLevel {
  Ok = 'OK',
  Alert = 'ALERT',
  Blocked = 'BLOCKED',
}

const LEVEL_RANK: Record<DebtLevel, number> = {
  [DebtLevel.Ok]: 0,
  [DebtLevel.Alert]: 1,
  [DebtLevel.Blocked]: 2,
};

export async function getMoneyPolicy(
  manager: EntityManager,
  currency: string,
): Promise<MoneyPolicy | null> {
  const rows: Array<{ currency: string; debtLimit: number; debtAlertThreshold: number }> =
    await manager.query(
      `SELECT "currency", "debtLimit", "debtAlertThreshold" FROM "money_policy" WHERE "currency" = $1`,
      [currency],
    );
  if (rows.length === 0) {
    return null;
  }
  return {
    currency: rows[0].currency,
    debtLimit: Number(rows[0].debtLimit),
    debtAlertThreshold: Number(rows[0].debtAlertThreshold),
  };
}

/** Dette (>= 0) d'un solde. */
export function debtOf(balance: number): number {
  return Math.max(0, -Number(balance ?? 0));
}

export function debtLevel(balance: number, policy: MoneyPolicy | null): DebtLevel {
  if (policy == null) {
    return DebtLevel.Ok;
  }
  const debt = debtOf(balance);
  if (debt > policy.debtLimit) {
    return DebtLevel.Blocked;
  }
  if (debt > 0 && debt >= policy.debtAlertThreshold) {
    return DebtLevel.Alert;
  }
  return DebtLevel.Ok;
}

/**
 * Kasimen de la liste au-dela du plafond. `currency` absente : dans
 * n'importe quelle devise (createOrder ne connait pas encore la devise de la
 * region quand il choisit les Kasimen ; une seule devise, XOF, au pilote).
 */
export async function blockedForDebtDriverIds(
  manager: EntityManager,
  driverIds: number[],
  currency?: string | null,
): Promise<Set<number>> {
  const ids = driverIds.map(Number).filter((id) => Number.isSafeInteger(id));
  if (ids.length === 0) {
    return new Set();
  }
  const rows: Array<{ driverId: number }> = await manager.query(
    `SELECT DISTINCT w."driverId"
       FROM "driver_wallet" w
       JOIN "money_policy" p ON p."currency" = w."currency"
      WHERE w."driverId" = ANY($1::int[])
        AND ($2::char(3) IS NULL OR w."currency" = $2::char(3))
        AND -w."amount" > p."debtLimit"`,
    [ids, currency ?? null],
  );
  return new Set(rows.map((r) => Number(r.driverId)));
}

/** Fiche §4.2 : une seule fonction pour la regle. */
export async function isBlockedForDebt(
  manager: EntityManager,
  driverId: number,
  currency?: string | null,
): Promise<boolean> {
  return (await blockedForDebtDriverIds(manager, [driverId], currency)).has(Number(driverId));
}

/** Devises dans lesquelles le Kasiman est au-dela du plafond. */
export async function blockedDebtCurrencies(
  manager: EntityManager,
  driverId: number,
): Promise<Set<string>> {
  const rows: Array<{ currency: string }> = await manager.query(
    `SELECT w."currency"
       FROM "driver_wallet" w
       JOIN "money_policy" p ON p."currency" = w."currency"
      WHERE w."driverId" = $1 AND -w."amount" > p."debtLimit"`,
    [Number(driverId)],
  );
  return new Set(rows.map((r) => r.currency));
}

// ---------------------------------------------------------------------------
// Etat du compte (kasimanAccount)
// ---------------------------------------------------------------------------

export interface KasimanDebtStatus {
  currency: string;
  balance: number;
  debt: number;
  debtLimit: number | null;
  debtAlertThreshold: number | null;
  level: DebtLevel;
  blocked: boolean;
}

export async function kasimanDebtStatus(
  manager: EntityManager,
  driverId: number,
  currency: string,
): Promise<KasimanDebtStatus> {
  const policy = await getMoneyPolicy(manager, currency);
  const rows: Array<{ balance: number }> = await manager.query(
    `SELECT "amount" AS "balance" FROM "driver_wallet" WHERE "driverId" = $1 AND "currency" = $2`,
    [Number(driverId), currency],
  );
  const balance = rows.length === 0 ? 0 : Number(rows[0].balance);
  const level = debtLevel(balance, policy);
  return {
    currency,
    balance,
    debt: debtOf(balance),
    debtLimit: policy?.debtLimit ?? null,
    debtAlertThreshold: policy?.debtAlertThreshold ?? null,
    level,
    blocked: level === DebtLevel.Blocked,
  };
}

/**
 * Devise par defaut du compte d'un Kasiman : celle de son portefeuille le plus
 * endette, sinon la premiere politique d'argent, sinon null.
 */
export async function defaultKasimanCurrency(
  manager: EntityManager,
  driverId: number,
): Promise<string | null> {
  const wallets: Array<{ currency: string }> = await manager.query(
    `SELECT "currency" FROM "driver_wallet" WHERE "driverId" = $1 ORDER BY "amount" ASC, "id" ASC LIMIT 1`,
    [Number(driverId)],
  );
  if (wallets.length > 0) {
    return wallets[0].currency;
  }
  const policies: Array<{ currency: string }> = await manager.query(
    `SELECT "currency" FROM "money_policy" ORDER BY "id" ASC LIMIT 1`,
  );
  return policies[0]?.currency ?? null;
}

// ---------------------------------------------------------------------------
// Passage d'un seuil (push une seule fois)
// ---------------------------------------------------------------------------

export interface DebtCrossing {
  driverId: number;
  currency: string;
  level: DebtLevel.Alert | DebtLevel.Blocked;
  balance: number;
  policy: MoneyPolicy;
}

/**
 * Seuil franchi vers le haut par un mouvement (avant -> apres), ou null.
 * Un mouvement qui franchit les deux seuils d'un coup ne renvoie que le
 * blocage : une seule push, la plus utile.
 */
export function debtCrossing(
  before: number,
  after: number,
  policy: MoneyPolicy | null,
): DebtLevel.Alert | DebtLevel.Blocked | null {
  if (policy == null) {
    return null;
  }
  const from = debtLevel(before, policy);
  const to = debtLevel(after, policy);
  if (LEVEL_RANK[to] > LEVEL_RANK[from]) {
    return to as DebtLevel.Alert | DebtLevel.Blocked;
  }
  return null;
}

async function lockedDriverBalance(
  manager: EntityManager,
  driverId: number,
  currency: string,
): Promise<number> {
  // Meme verrou consultatif que postWalletOperation (re-entrant dans la
  // transaction) : le solde « avant » ne peut pas changer jusqu'a la
  // validation. Deux mouvements simultanes ne voient donc jamais le meme
  // passage de seuil : la push part une seule fois.
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    walletLockKey('driver_wallet', { driverId: Number(driverId) }, currency),
  ]);
  const rows: Array<{ balance: number }> = await manager.query(
    `SELECT "amount" AS "balance" FROM "driver_wallet" WHERE "driverId" = $1 AND "currency" = $2`,
    [Number(driverId), currency],
  );
  return rows.length === 0 ? 0 : Number(rows[0].balance);
}

/**
 * Execute `fn` (un mouvement d'argent du Kasiman, dans la transaction
 * `manager`, deja ouverte) et dit si le mouvement a franchi le seuil d'alerte
 * ou le plafond. La push est a envoyer par l'appelant APRES validation.
 */
export async function watchDebtCrossing<T>(
  manager: EntityManager,
  driverId: number,
  currency: string,
  fn: () => Promise<T>,
): Promise<{ result: T; crossing: DebtCrossing | null }> {
  const before = await lockedDriverBalance(manager, driverId, currency);
  const result = await fn();
  const after = await lockedDriverBalance(manager, driverId, currency);
  const policy = await getMoneyPolicy(manager, currency);
  const level = debtCrossing(before, after, policy);
  return {
    result,
    crossing:
      level == null || policy == null
        ? null
        : { driverId: Number(driverId), currency, level, balance: after, policy },
  };
}

// ---------------------------------------------------------------------------
// Textes (francais direct : les apps installees ne connaissent aucune cle
// de traduction nouvelle, fiche §4.2)
// ---------------------------------------------------------------------------

/** 12300 -> « 12 300 » (espace insecable), -12300 -> « −12 300 ». */
export function formatAmount(amount: number): string {
  const value = Math.round(Number(amount ?? 0));
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${value < 0 ? '−' : ''}${digits}`;
}

function money(amount: number, currency: string): string {
  return `${formatAmount(amount)} ${currency === 'XOF' ? 'FCFA' : currency}`;
}

/** Message du refus d'acceptation, affiche tel quel par driver-app. */
export function debtLimitMessage(balance: number, policy: MoneyPolicy): string {
  return (
    `Votre solde Kasi est de ${money(balance, policy.currency)}, au-delà du plafond de ` +
    `${money(policy.debtLimit, policy.currency)}. Réglez votre dette pour recevoir de nouvelles courses.`
  );
}

/** Erreur GraphQL du refus : message lisible, code stable dans `extensions.code`. */
export function debtLimitError(balance: number, policy: MoneyPolicy): GraphQLError {
  return new GraphQLError(debtLimitMessage(balance, policy), {
    extensions: {
      code: KASIMAN_DEBT_LIMIT,
      balance,
      debtLimit: policy.debtLimit,
      currency: policy.currency,
    },
  });
}

export function debtPushText(crossing: DebtCrossing): { title: string; body: string } {
  const { balance, policy } = crossing;
  if (crossing.level === DebtLevel.Blocked) {
    return {
      title: 'Courses suspendues',
      body:
        `Votre solde Kasi est de ${money(balance, policy.currency)}, au-delà du plafond de ` +
        `${money(policy.debtLimit, policy.currency)}. Réglez votre dette auprès de Kasi pour ` +
        `recevoir de nouvelles courses.`,
    };
  }
  return {
    title: 'Solde Kasi : seuil d’alerte atteint',
    body:
      `Votre solde Kasi est de ${money(balance, policy.currency)}. Au-delà d’une dette de ` +
      `${money(policy.debtLimit, policy.currency)}, vous ne recevrez plus de courses. ` +
      `Pensez à régler votre dette auprès de Kasi.`,
  };
}

/**
 * Envoie la push d'un passage de seuil, en texte direct. Best effort : une
 * push perdue ne remet jamais en cause le mouvement d'argent deja valide.
 */
export async function sendDebtCrossingPush(
  manager: EntityManager,
  notifications: { plainText(driver: unknown, title: string, body: string): unknown },
  crossing: DebtCrossing | null | undefined,
): Promise<void> {
  if (crossing == null) {
    return;
  }
  try {
    const rows: Array<{ id: number; notificationPlayerId: string | null }> = await manager.query(
      `SELECT "id", "notificationPlayerId" FROM "driver" WHERE "id" = $1`,
      [crossing.driverId],
    );
    if (rows.length === 0) {
      return;
    }
    const { title, body } = debtPushText(crossing);
    await notifications.plainText(rows[0], title, body);
  } catch {
    // Push perdue : sans effet sur l'argent.
  }
}

// ---------------------------------------------------------------------------
// Reglement de la dette par un operateur (fiche §4.4)
// ---------------------------------------------------------------------------

export interface DebtSettlementInput {
  driverId: number;
  amount: number;
  currency: string;
  receiptNumber: string;
  motif: string;
  location?: string | null;
  idempotencyKey: string;
  operatorId: number;
}

/** Cle de l'ecriture d'un reglement (fiche §3.6). */
export function debtSettlementKey(clientKey: string): string {
  return `debt-settlement:${clientKey.trim()}`;
}

/** Lieu de caisse : lettres, chiffres, `_` et `-`, en majuscules ; SIEGE par defaut. */
export function cashLocation(location?: string | null): string {
  const value = (location ?? '').trim().toUpperCase();
  if (value === '') {
    return 'SIEGE';
  }
  if (!/^[A-Z0-9_-]{1,32}$/.test(value)) {
    throw new GraphQLError(
      'Lieu de caisse invalide : lettres, chiffres, « _ » ou « - », 32 caractères au plus.',
      { extensions: { code: 'DEBT_SETTLEMENT_INVALID' } },
    );
  }
  return value;
}

function settlementError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'DEBT_SETTLEMENT_INVALID' } });
}

/**
 * Especes recues du Kasiman contre recu : `CAISSE:<lieu> -x / KASIMAN:<id> +x`
 * (nature REGLEMENT_DETTE, motif, recu, operateur). Ligne de portefeuille
 * `Recharge` / `BankTransfer` (valeurs que driver-app connait deja : aucune
 * valeur d'enumeration nouvelle, fiche §6). Le deblocage est immediat : les
 * filtres et l'acceptation relisent le solde.
 *
 * Refus : montant non entier ou nul, motif ou recu vide, montant superieur a
 * la dette du moment (verifie sous le verrou du portefeuille : un reglement
 * ne rend jamais le solde positif, un versement ne peut donc pas rendre les
 * especes deposees). Rejeu de la meme cle : aucun nouveau credit.
 */
export async function settleKasimanDebt(
  manager: EntityManager,
  input: DebtSettlementInput,
): Promise<LedgerPostResult> {
  const amount = Number(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw settlementError('Le montant du règlement doit être un nombre entier positif.');
  }
  const motif = input.motif?.trim() ?? '';
  const receipt = input.receiptNumber?.trim() ?? '';
  const clientKey = input.idempotencyKey?.trim() ?? '';
  if (motif === '' || receipt === '') {
    throw settlementError('Le motif et le numéro de reçu sont obligatoires.');
  }
  if (motif.length > 150 || receipt.length > 64) {
    throw settlementError('Motif (150 caractères) ou numéro de reçu (64 caractères) trop long.');
  }
  if (clientKey === '' || clientKey.length > 100) {
    throw settlementError('Clé de règlement manquante ou trop longue (100 caractères au plus).');
  }
  const currency = (input.currency ?? '').trim().toUpperCase();
  const lieu = cashLocation(input.location);
  const key = debtSettlementKey(clientKey);
  const kasiman = LedgerAccounts.kasiman(input.driverId);
  return postLedgerEntry(manager, {
    idempotencyKey: key,
    nature: LedgerEntryNature.ReglementDette,
    currency,
    operatorId: input.operatorId,
    reference: receipt,
    motif,
    lines: [
      { account: LedgerAccounts.caisse(lieu), amount: -amount, nature: LedgerLineNature.Reglement },
      { account: kasiman, amount, nature: LedgerLineNature.Reglement },
    ],
    walletLines: [
      {
        account: kasiman,
        amount,
        fields: {
          action: TransactionAction.Recharge,
          rechargeType: DriverRechargeTransactionType.BankTransfer,
          status: TransactionStatus.Done,
          operatorId: input.operatorId,
          refrenceNumber: receipt,
          description: `Règlement de dette (reçu ${receipt}, caisse ${lieu}) : ${motif}`,
          idempotencyKey: key,
        },
        guard: (balance) => {
          const debt = debtOf(balance);
          if (debt <= 0) {
            throw settlementError("Ce Kasiman n'a pas de dette à régler dans cette devise.");
          }
          if (amount > debt) {
            throw settlementError(
              `Le règlement (${money(amount, currency)}) dépasse la dette du Kasiman ` +
                `(${money(debt, currency)}).`,
            );
          }
        },
      },
    ],
  });
}
