import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { TranslateService } from "@ngx-translate/core";

/**
 * p2-argent I3 (2026-10-19, fiche argent §4.1) : statut de dette d'un
 * Kasiman, calcule a partir de ses portefeuilles et de `money_policy`.
 * Meme regle que `debtLevel` (libs/database/src/lib/order/debt-limit.ts) :
 * bloque strictement au-dela du plafond, alerte a partir du seuil.
 */
export type DebtLevel = "ok" | "alert" | "blocked";

export interface DebtPolicy {
  currency: string;
  debtLimit: number;
  debtAlertThreshold: number;
}

export interface DebtWallet {
  balance: number;
  currency: string;
}

export interface DebtStatus {
  currency: string;
  balance: number;
  debt: number;
  level: DebtLevel;
  debtLimit: number | null;
  debtAlertThreshold: number | null;
}

const RANK: Record<DebtLevel, number> = { ok: 0, alert: 1, blocked: 2 };

export function debtLevelOf(balance: number, policy?: DebtPolicy | null): DebtLevel {
  if (policy == null) return "ok";
  const debt = Math.max(0, -Number(balance ?? 0));
  if (debt > policy.debtLimit) return "blocked";
  if (debt > 0 && debt >= policy.debtAlertThreshold) return "alert";
  return "ok";
}

/**
 * Statut le plus grave parmi les portefeuilles du Kasiman (a egalite, la plus
 * grosse dette). `null` : aucun portefeuille.
 */
export function debtStatusOf(
  wallets: DebtWallet[] | null | undefined,
  policies: DebtPolicy[] | null | undefined,
): DebtStatus | null {
  const list = (wallets ?? []).map((wallet) => {
    const policy = (policies ?? []).find((p) => p.currency === wallet.currency);
    const balance = Number(wallet.balance ?? 0);
    return {
      currency: wallet.currency,
      balance,
      debt: Math.max(0, -balance),
      level: debtLevelOf(balance, policy),
      debtLimit: policy?.debtLimit ?? null,
      debtAlertThreshold: policy?.debtAlertThreshold ?? null,
    } as DebtStatus;
  });
  if (list.length === 0) return null;
  return list.sort((a, b) => RANK[b.level] - RANK[a.level] || b.debt - a.debt)[0];
}

export function debtTagColor(level: DebtLevel): string {
  switch (level) {
    case "blocked":
      return "red";
    case "alert":
      return "orange";
    default:
      return "green";
  }
}

/** Codes d'erreur traduits par le panel sur les ecrans financiers. */
const TRANSLATED_CODES = ["PERMISSION_NOT_GRANTED", "KASIMAN_DEBT_LIMIT"];

/**
 * Message d'erreur d'une operation financiere : code connu traduit
 * (`error.<CODE>`), sinon le message du serveur (deja en francais pour
 * `DEBT_SETTLEMENT_INVALID` et `MONEY_POLICY_INVALID`).
 */
export function financialErrorMessage(error: any, translate: TranslateService): string {
  const first = CombinedGraphQLErrors.is(error) ? error.errors[0] : undefined;
  const code = (first?.extensions?.["code"] as string | undefined) ?? undefined;
  const message: string = first?.message ?? error?.message ?? String(error);
  const key = [message, code].find((value) => value != null && TRANSLATED_CODES.includes(value));
  if (key == null) return message;
  if (key === "KASIMAN_DEBT_LIMIT") {
    const ext = first?.extensions ?? {};
    const currency = String(ext["currency"] ?? "");
    const unit = currency === "XOF" ? "FCFA" : currency;
    const amount = (value: unknown) => Number(value ?? 0).toLocaleString("fr-FR");
    return translate.instant("error.KASIMAN_DEBT_LIMIT", {
      balance: `${amount(ext["balance"])} ${unit}`,
      debtLimit: `${amount(ext["debtLimit"])} ${unit}`,
    });
  }
  return translate.instant(`error.${key}`);
}

/** Cle d'unicite d'un formulaire de reglement (une par ouverture). */
export function newIdempotencyKey(): string {
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (c?.randomUUID != null) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues != null) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
