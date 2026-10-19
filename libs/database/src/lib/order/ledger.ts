import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';

import { DriverTransactionEntity } from '../entities/driver-transaction.entity';
import { DriverWalletEntity } from '../entities/driver-wallet.entity';
import {
  LedgerAccountKind,
  LedgerEntryNature,
  LedgerLineNature,
} from '../entities/enums/ledger.enum';
import { PayoutMethodType } from '../entities/enums/payout-method-type.enum';
import { FleetTransactionEntity } from '../entities/fleet-transaction.entity';
import { FleetWalletEntity } from '../entities/fleet-wallet.entity';
import { ProviderTransactionEntity } from '../entities/provider-transaction.entity';
import { ProviderWalletEntity } from '../entities/provider-wallet.entity';
import { RiderTransactionEntity } from '../entities/rider-transaction.entity';
import { RiderWalletEntity } from '../entities/rider-wallet.entity';
import { operatorIdempotencyKey, postWalletOperation } from './wallet-ledger';

export { LedgerAccountKind, LedgerEntryNature, LedgerLineNature };

/**
 * p2-argent I2 (2026-10-19) : grand livre en partie double, SEUL point
 * d'entree de l'argent (docs/fiche-conception-argent.md §3).
 *
 * Avant : chaque site (fin de course, annulation, passerelle, carte cadeau,
 * versement, operations manuelles) appelait `rechargeWallet` /
 * `postWalletOperation` portefeuille par portefeuille. Rien ne prouvait qu'une
 * operation laissait des comptes equilibres, et une recharge, un versement ou
 * un credit manuel n'avaient pas de contrepartie.
 *
 * Maintenant, `postLedgerEntry(manager, entry)`, dans la transaction de
 * l'appelant :
 * 1. insere l'ecriture en `ON CONFLICT DO NOTHING` sur sa cle : un rejeu ne
 *    cree ni ecriture, ni ligne, ni mouvement de portefeuille ;
 * 2. cree au besoin les comptes (premier mouvement), insere les lignes et fait
 *    verifier l'equilibre PAR LA BASE (declencheur differe, avance ici en
 *    IMMEDIATE) ;
 * 3. ecrit les lignes de portefeuille (projections) par `postWalletOperation`,
 *    avec leurs types et leurs cles d'aujourd'hui et `ledgerEntryId`. Le
 *    portefeuille reste ce que lisent les apps installees.
 *
 * `LEDGER_MODE` (fiche §3.7) : `shadow` (defaut) ecrit le grand livre derriere
 * un SAVEPOINT ; une erreur du grand livre est journalisee et l'operation se
 * fait quand meme, comme avant I2 (lignes de portefeuille sans ledgerEntryId,
 * ecart signale par ledgerIntegrityReport). `strict` : une ecriture refusee
 * annule l'operation. Une erreur METIER levee pendant l'ecriture des
 * portefeuilles (garde « solde suffisant » d'un versement) est toujours
 * propagee, quel que soit le mode.
 *
 * Montants : entiers (FCFA, aucune subdivision). Les sites arrondissent avec
 * `roundFcfa` ; un montant non entier est refuse (journalise en shadow).
 */

// ---------------------------------------------------------------------------
// Mode, arrondi
// ---------------------------------------------------------------------------

export type LedgerMode = 'shadow' | 'strict';

let warnedMode: string | null = null;

/** Lu a chaque appel : la bascule shadow -> strict ne demande qu'un redemarrage. */
export function ledgerMode(env: NodeJS.ProcessEnv = process.env): LedgerMode {
  const raw = (env['LEDGER_MODE'] ?? '').trim().toLowerCase();
  if (raw === 'strict') {
    return 'strict';
  }
  if (raw !== '' && raw !== 'shadow' && warnedMode !== raw) {
    warnedMode = raw;
    Logger.warn(`LEDGER_MODE="${raw}" inconnu : mode shadow`, 'Ledger');
  }
  return 'shadow';
}

/**
 * Arrondi au franc le plus proche, demi vers le haut (fiche §3.5) :
 * 187,5 -> 188. La marge de 1e-9 absorbe les residus du calcul flottant
 * (15 % de 1 250 calcule 187,49999999...).
 */
export function roundFcfa(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw new LedgerError('LEDGER_AMOUNT_NOT_FINITE', `montant invalide : ${amount}`);
  }
  return Math.floor(value + 0.5 + 1e-9);
}

/**
 * Commission d'une course et sa repartition (fiche §3.5, flotte option A) :
 * commission arrondie au franc, part de flotte calculee sur la commission
 * arrondie puis arrondie, part Kasi = commission - part de flotte (par
 * difference : l'ecriture reste equilibree sans ligne d'arrondi).
 */
export function splitCommission(
  rawCommission: number,
  fleet?: { commissionSharePercent: number; commissionShareFlat: number } | null,
): { commission: number; fleetShare: number; kasiShare: number } {
  const commission = roundFcfa(rawCommission);
  let fleetShare = 0;
  if (fleet != null) {
    const raw =
      (commission * Number(fleet.commissionSharePercent ?? 0)) / 100 +
      Number(fleet.commissionShareFlat ?? 0);
    fleetShare = Math.max(0, roundFcfa(raw));
  }
  return { commission, fleetShare, kasiShare: commission - fleetShare };
}

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export interface LedgerAccountRef {
  kind: LedgerAccountKind;
  /** Code unique avec la devise : `KASIMAN:12`, `KASI:PRODUITS`... */
  code: string;
  ownerId?: number | null;
}

/** Codes des comptes (fiche §3.2). Un seul endroit pour les formats. */
export const LedgerAccounts = {
  kasiman: (driverId: number | string): LedgerAccountRef => ({
    kind: LedgerAccountKind.Kasiman,
    code: `KASIMAN:${Number(driverId)}`,
    ownerId: Number(driverId),
  }),
  client: (riderId: number | string): LedgerAccountRef => ({
    kind: LedgerAccountKind.Client,
    code: `CLIENT:${Number(riderId)}`,
    ownerId: Number(riderId),
  }),
  flotte: (fleetId: number | string): LedgerAccountRef => ({
    kind: LedgerAccountKind.Flotte,
    code: `FLOTTE:${Number(fleetId)}`,
    ownerId: Number(fleetId),
  }),
  /** Commissions et frais d'annulation ; projete sur `admin_wallet`. */
  kasiProduits: (): LedgerAccountRef => kasi('PRODUITS'),
  kasiPromotions: (): LedgerAccountRef => kasi('PROMOTIONS'),
  kasiCorrections: (): LedgerAccountRef => kasi('CORRECTIONS'),
  kasiOuverture: (): LedgerAccountRef => kasi('OUVERTURE'),
  kasiArrondis: (): LedgerAccountRef => kasi('ARRONDIS'),
  /** Especes recues ou remises par Kasi (siege par defaut). */
  caisse: (lieu = 'SIEGE'): LedgerAccountRef => ({
    kind: LedgerAccountKind.Caisse,
    code: `CAISSE:${lieu.trim().toUpperCase()}`,
  }),
  /** Argent encaisse par une passerelle, pas encore reverse a Kasi. */
  passerelle: (gatewayId: number | string | undefined | null): LedgerAccountRef => ({
    kind: LedgerAccountKind.Passerelle,
    code: `PASSERELLE:${gatewayId ?? 'none'}`,
  }),
  /** Sorties reelles (versements) : WAVE, ORANGE_MONEY, BANQUE. */
  tresorerie: (canal: 'WAVE' | 'ORANGE_MONEY' | 'BANQUE'): LedgerAccountRef => ({
    kind: LedgerAccountKind.Tresorerie,
    code: `TRESORERIE:${canal}`,
  }),
  /**
   * Contrepartie d'un versement selon sa methode : Wave, Orange Money et
   * virement sortent de la tresorerie ; un versement en especes sort de la
   * caisse du siege.
   */
  payoutCounterpart: (method: PayoutMethodType | string): LedgerAccountRef => {
    switch (method) {
      case PayoutMethodType.Wave:
        return LedgerAccounts.tresorerie('WAVE');
      case PayoutMethodType.OrangeMoney:
        return LedgerAccounts.tresorerie('ORANGE_MONEY');
      case PayoutMethodType.Cash:
        return LedgerAccounts.caisse();
      default:
        return LedgerAccounts.tresorerie('BANQUE');
    }
  },
};

function kasi(name: string): LedgerAccountRef {
  return { kind: LedgerAccountKind.Kasi, code: `KASI:${name}` };
}

/**
 * Contreparties permises pour une operation manuelle du back-office
 * (fiche §3.4) ; defaut : CORRECTIONS.
 */
export enum ManualCounterparty {
  Corrections = 'CORRECTIONS',
  Promotions = 'PROMOTIONS',
  Caisse = 'CAISSE',
}

export function manualCounterpartAccount(
  counterparty?: ManualCounterparty | string | null,
): LedgerAccountRef {
  switch (counterparty) {
    case ManualCounterparty.Promotions:
      return LedgerAccounts.kasiPromotions();
    case ManualCounterparty.Caisse:
      return LedgerAccounts.caisse();
    default:
      return LedgerAccounts.kasiCorrections();
  }
}

/** Motif par defaut d'une operation manuelle sans motif saisi. */
export const DEFAULT_MANUAL_MOTIF = 'Operation manuelle du back-office (motif non saisi)';

/** Cle d'une operation manuelle sans cle fournie (fiche §3.6). */
export function autoOperatorKey(): string {
  return `operator-auto:${randomUUID()}`;
}

interface Projection {
  walletEntity: EntityTarget<ObjectLiteral>;
  transactionEntity: EntityTarget<ObjectLiteral>;
  walletTable: string;
  transactionTable: string;
  /** Colonne proprietaire, sur le portefeuille ET la ligne ; null pour admin_wallet. */
  ownerColumn: string | null;
  /** Historique : driver et provider n'ecrivent pas de ligne a montant nul. */
  recordZeroAmount: boolean;
}

const PROJECTIONS: Record<string, Projection> = {
  [LedgerAccountKind.Kasiman]: {
    walletEntity: DriverWalletEntity,
    transactionEntity: DriverTransactionEntity,
    walletTable: 'driver_wallet',
    transactionTable: 'driver_transaction',
    ownerColumn: 'driverId',
    recordZeroAmount: false,
  },
  [LedgerAccountKind.Client]: {
    walletEntity: RiderWalletEntity,
    transactionEntity: RiderTransactionEntity,
    walletTable: 'rider_wallet',
    transactionTable: 'rider_transaction',
    ownerColumn: 'riderId',
    recordZeroAmount: true,
  },
  [LedgerAccountKind.Flotte]: {
    walletEntity: FleetWalletEntity,
    transactionEntity: FleetTransactionEntity,
    walletTable: 'fleet_wallet',
    transactionTable: 'fleet_transaction',
    ownerColumn: 'fleetId',
    recordZeroAmount: true,
  },
  'KASI:PRODUITS': {
    walletEntity: ProviderWalletEntity,
    transactionEntity: ProviderTransactionEntity,
    walletTable: 'admin_wallet',
    transactionTable: 'admin_transaction',
    ownerColumn: null,
    recordZeroAmount: false,
  },
};

/** Portefeuille projete d'un compte, ou null (compte interne de Kasi). */
export function projectionOf(account: LedgerAccountRef): Projection | null {
  return PROJECTIONS[account.kind] ?? PROJECTIONS[account.code] ?? null;
}

/** Les quatre projections (ouverture, controle d'integrite). */
export function allProjections(): Array<Projection & { kind: LedgerAccountKind; code?: string }> {
  return [
    { ...PROJECTIONS[LedgerAccountKind.Kasiman], kind: LedgerAccountKind.Kasiman },
    { ...PROJECTIONS[LedgerAccountKind.Client], kind: LedgerAccountKind.Client },
    { ...PROJECTIONS[LedgerAccountKind.Flotte], kind: LedgerAccountKind.Flotte },
    { ...PROJECTIONS['KASI:PRODUITS'], kind: LedgerAccountKind.Kasi, code: 'KASI:PRODUITS' },
  ];
}

/** Compte du grand livre d'un portefeuille (proprietaire lu sur la ligne). */
export function accountOfWallet(
  kind: LedgerAccountKind,
  ownerId: number | null,
): LedgerAccountRef {
  switch (kind) {
    case LedgerAccountKind.Kasiman:
      return LedgerAccounts.kasiman(ownerId!);
    case LedgerAccountKind.Client:
      return LedgerAccounts.client(ownerId!);
    case LedgerAccountKind.Flotte:
      return LedgerAccounts.flotte(ownerId!);
    default:
      return LedgerAccounts.kasiProduits();
  }
}

// ---------------------------------------------------------------------------
// Ecriture
// ---------------------------------------------------------------------------

export interface LedgerLineInput {
  account: LedgerAccountRef;
  /** Entier signe : positif = le compte recoit. Une ligne nulle est ignoree. */
  amount: number;
  nature: LedgerLineNature;
}

/**
 * Ligne de portefeuille a ecrire (projection d'un compte de tiers ou de
 * KASI:PRODUITS). Pour chaque compte projete, la somme des lignes de
 * portefeuille doit egaler la somme de ses lignes du grand livre (ex. fin de
 * course : PRIX + POURBOIRE au grand livre, une seule ligne `OrderFee` au
 * portefeuille, comme avant).
 */
export interface LedgerWalletLineInput {
  account: LedgerAccountRef;
  amount: number;
  /**
   * Colonnes de la ligne de portefeuille (action, types, statut, cle
   * d'aujourd'hui, requestId...), hors montant, proprietaire et devise.
   */
  fields: ObjectLiteral;
  /** Controle sous verrou du portefeuille (ex. solde suffisant). */
  guard?: (currentBalance: number) => void;
}

export interface LedgerEntryInput {
  /** Cle de l'operation entiere (fiche §3.6) : `order:<id>:finish`... */
  idempotencyKey: string;
  nature: LedgerEntryNature;
  currency: string;
  requestId?: number | null;
  operatorId?: number | null;
  reference?: string | null;
  motif?: string | null;
  reversesEntryId?: number | null;
  /** Especes encaissees par le Kasiman (fin de course). */
  cashCollected?: number | null;
  lines: LedgerLineInput[];
  walletLines?: LedgerWalletLineInput[];
}

export interface LedgerWalletResult<W = ObjectLiteral> {
  /** Portefeuille apres l'operation (null : jamais cree, rejeu sans portefeuille). */
  wallet: W | null;
  transactionId?: number;
  applied: boolean;
}

export interface LedgerPostResult {
  /** false : rejeu (cle deja connue), rien n'a ete ecrit. */
  applied: boolean;
  /** Ecriture creee ou deja existante ; null en shadow si le grand livre a echoue. */
  entryId: number | null;
  /** Shadow : erreur du grand livre, journalisee ; l'operation s'est faite sans lui. */
  ledgerError?: string;
  /** Une entree par ligne de portefeuille, dans l'ordre de `walletLines`. */
  wallets: LedgerWalletResult[];
}

/** Erreur du grand livre (code stable en message). */
export class LedgerError extends Error {
  constructor(
    public readonly code: string,
    detail?: string,
  ) {
    super(detail == null ? code : `${code}: ${detail}`);
    this.name = 'LedgerError';
  }
}

/** Lignes de portefeuille deja presentes (cles d'avant I2) : c'est un rejeu. */
class LegacyWalletReplay extends Error {}

let savepointSeq = 0;

/**
 * Seul point d'entree de l'argent. Voir l'en-tete du fichier.
 * Ouvre sa propre transaction si l'appelant n'en a pas.
 */
export async function postLedgerEntry(
  manager: EntityManager,
  entry: LedgerEntryInput,
): Promise<LedgerPostResult> {
  if (!manager.queryRunner?.isTransactionActive) {
    return manager.transaction((m) => postLedgerEntry(m, entry));
  }
  const mode = ledgerMode();
  const walletLines = orderWalletLines(entry.walletLines ?? []);
  let invalid: Error | null = null;
  try {
    validateEntry(entry);
  } catch (error) {
    invalid = error as Error;
  }

  const savepoint = `kasi_ledger_${++savepointSeq}`;
  await manager.query(`SAVEPOINT ${savepoint}`);
  let phase: 'ledger' | 'wallet' = 'ledger';
  let immediate = false;
  try {
    if (invalid != null) {
      throw invalid;
    }
    const entryId = await insertLedgerEntry(manager, entry);
    if (entryId == null) {
      await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
      Logger.log(
        `Ecriture deja enregistree, rejeu ignore (${entry.idempotencyKey})`,
        'Ledger',
      );
      return {
        applied: false,
        entryId: await existingEntryId(manager, entry.idempotencyKey),
        wallets: await readWallets(manager, entry.currency, entry.walletLines ?? []),
      };
    }
    await insertLines(manager, entryId, entry);
    // Controle d'equilibre par la base, tout de suite (et non a la validation
    // de la transaction) : en shadow, l'erreur reste dans le SAVEPOINT.
    immediate = true;
    await manager.query('SET CONSTRAINTS "ledger_line_balance_check" IMMEDIATE');
    await manager.query('SET CONSTRAINTS "ledger_line_balance_check" DEFERRED');
    immediate = false;

    phase = 'wallet';
    const results = await postWallets(manager, entry.currency, walletLines, entryId);
    if (results.some((r) => !r.applied)) {
      throw new LegacyWalletReplay();
    }
    await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { applied: true, entryId, wallets: results };
  } catch (error) {
    await manager.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
    if (immediate) {
      await manager.query('SET CONSTRAINTS "ledger_line_balance_check" DEFERRED');
    }
    if (error instanceof LegacyWalletReplay) {
      // Lignes de portefeuille ecrites avant I2 avec la meme cle : l'operation
      // est deja faite, l'ecriture neuve est annulee avec elles.
      Logger.warn(
        `Operation deja enregistree avant le grand livre, rejeu ignore (${entry.idempotencyKey})`,
        'Ledger',
      );
      return {
        applied: false,
        entryId: null,
        wallets: await readWallets(manager, entry.currency, entry.walletLines ?? []),
      };
    }
    if (phase === 'wallet' || mode === 'strict') {
      throw error;
    }
    const message = (error as Error).message;
    Logger.error(
      `Grand livre (LEDGER_MODE=shadow) : ecriture ${entry.idempotencyKey} NON enregistree, ` +
        `operation faite sans elle : ${message}`,
      undefined,
      'Ledger',
    );
    const ordered = await postWallets(manager, entry.currency, walletLines, null);
    return {
      applied: ordered.length === 0 || ordered.some((r) => r.applied),
      entryId: null,
      ledgerError: message,
      wallets: ordered,
    };
  }
}

/**
 * Operation manuelle du back-office (createDriverTransaction,
 * createRiderTransaction, createFleetTransaction), fiche §3.4 et §3.6.
 *
 * - Contrepartie facultative : CORRECTIONS par defaut, ou PROMOTIONS (geste
 *   commercial), ou CAISSE (especes recues ou remises au siege).
 * - Motif facultatif : le motif saisi, sinon la description, sinon
 *   DEFAULT_MANUAL_MOTIF. L'ecriture en porte toujours un.
 * - Cle : `operator:<cle>` si le back-office en fournit une (double envoi =
 *   une operation, comme en phase 1) ; sinon l'ecriture recoit
 *   `operator-auto:<uuid>` et la ligne de portefeuille reste sans cle :
 *   chaque appel compte, comme avant.
 */
export interface ManualOperationInput {
  /** Compte vise (Kasiman, client ou flotte). */
  account: LedgerAccountRef;
  /** Montant signe, deja force selon `action` par le resolveur. */
  amount: number;
  currency: string;
  operatorId: number;
  clientKey?: string | null;
  counterparty?: ManualCounterparty | string | null;
  motif?: string | null;
  /** Colonnes de la ligne de portefeuille (action, types, reference, description...). */
  walletFields: ObjectLiteral;
}

export async function postManualOperation(
  manager: EntityManager,
  input: ManualOperationInput,
): Promise<LedgerPostResult> {
  const walletKey = operatorIdempotencyKey(input.clientKey) ?? null;
  const description =
    typeof input.walletFields['description'] === 'string'
      ? (input.walletFields['description'] as string)
      : null;
  const motif = input.motif?.trim() || description?.trim() || DEFAULT_MANUAL_MOTIF;
  const amount = Number(input.amount);
  return postLedgerEntry(manager, {
    idempotencyKey: walletKey ?? autoOperatorKey(),
    nature: LedgerEntryNature.Correction,
    currency: input.currency,
    operatorId: input.operatorId,
    reference: (input.walletFields['refrenceNumber'] as string | undefined) ?? null,
    motif,
    lines: [
      { account: input.account, amount, nature: LedgerLineNature.Correction },
      {
        account: manualCounterpartAccount(input.counterparty),
        amount: -amount,
        nature: LedgerLineNature.Correction,
      },
    ],
    walletLines: [
      {
        account: input.account,
        amount,
        fields: {
          ...input.walletFields,
          operatorId: input.operatorId,
          idempotencyKey: walletKey,
        },
      },
    ],
  });
}

function validateEntry(entry: LedgerEntryInput): void {
  const key = entry.idempotencyKey?.trim();
  if (key == null || key === '' || key.length > 128) {
    throw new LedgerError('LEDGER_INVALID_KEY', String(entry.idempotencyKey));
  }
  if (entry.currency == null || entry.currency.trim().length !== 3) {
    throw new LedgerError('LEDGER_INVALID_CURRENCY', String(entry.currency));
  }
  const byAccount = new Map<string, number>();
  let total = 0;
  for (const line of entry.lines) {
    if (!Number.isSafeInteger(line.amount)) {
      throw new LedgerError(
        'LEDGER_AMOUNT_NOT_INTEGER',
        `${line.account.code} ${line.nature} ${line.amount}`,
      );
    }
    total += line.amount;
    if (projectionOf(line.account) != null) {
      byAccount.set(line.account.code, (byAccount.get(line.account.code) ?? 0) + line.amount);
    }
  }
  if (total !== 0) {
    throw new LedgerError('LEDGER_ENTRY_UNBALANCED', `${entry.idempotencyKey} : somme ${total}`);
  }
  if (entry.cashCollected != null && !Number.isSafeInteger(entry.cashCollected)) {
    throw new LedgerError('LEDGER_AMOUNT_NOT_INTEGER', `especes ${entry.cashCollected}`);
  }
  const byWallet = new Map<string, number>();
  for (const line of entry.walletLines ?? []) {
    if (projectionOf(line.account) == null) {
      throw new LedgerError('LEDGER_NOT_PROJECTED', line.account.code);
    }
    if (!Number.isSafeInteger(line.amount)) {
      throw new LedgerError('LEDGER_AMOUNT_NOT_INTEGER', `${line.account.code} ${line.amount}`);
    }
    byWallet.set(line.account.code, (byWallet.get(line.account.code) ?? 0) + line.amount);
  }
  for (const code of new Set([...byAccount.keys(), ...byWallet.keys()])) {
    if ((byAccount.get(code) ?? 0) !== (byWallet.get(code) ?? 0)) {
      throw new LedgerError(
        'LEDGER_PROJECTION_MISMATCH',
        `${code} : grand livre ${byAccount.get(code) ?? 0}, portefeuille ${byWallet.get(code) ?? 0}`,
      );
    }
  }
}

/**
 * Ordre fixe des portefeuilles (Kasiman, flotte, client, Kasi ; puis
 * proprietaire) : deux transactions prennent les verrous consultatifs dans le
 * meme ordre, sans interblocage. Tri stable : l'ordre des lignes d'un meme
 * portefeuille est conserve (historique des apps inchange).
 */
const KIND_ORDER: Record<string, number> = {
  [LedgerAccountKind.Kasiman]: 0,
  [LedgerAccountKind.Flotte]: 1,
  [LedgerAccountKind.Client]: 2,
  [LedgerAccountKind.Kasi]: 3,
};

interface IndexedWalletLine extends LedgerWalletLineInput {
  index: number;
}

function orderWalletLines(lines: LedgerWalletLineInput[]): IndexedWalletLine[] {
  return lines
    .map((line, index) => ({ ...line, index }))
    .sort(
      (a, b) =>
        (KIND_ORDER[a.account.kind] ?? 9) - (KIND_ORDER[b.account.kind] ?? 9) ||
        (a.account.ownerId ?? 0) - (b.account.ownerId ?? 0) ||
        a.index - b.index,
    );
}

/**
 * En-tete d'ecriture en `ON CONFLICT DO NOTHING` ; null si la cle existe deja
 * (rejeu). Exporte pour l'ouverture (ledger-open.ts) ; partout ailleurs,
 * passer par postLedgerEntry.
 */
export async function insertLedgerEntry(
  manager: EntityManager,
  entry: LedgerEntryInput,
): Promise<number | null> {
  const rows: Array<{ id: number }> = await manager.query(
    `INSERT INTO "ledger_entry" ("idempotencyKey", "nature", "currency", "requestId",
       "operatorId", "reference", "motif", "reversesEntryId", "cashCollected")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT ("idempotencyKey") DO NOTHING
     RETURNING "id"`,
    [
      entry.idempotencyKey.trim(),
      entry.nature,
      entry.currency,
      entry.requestId ?? null,
      entry.operatorId ?? null,
      entry.reference ?? null,
      entry.motif == null ? null : String(entry.motif).slice(0, 500),
      entry.reversesEntryId ?? null,
      entry.cashCollected ?? null,
    ],
  );
  return rows.length === 0 ? null : Number(rows[0].id);
}

async function existingEntryId(manager: EntityManager, key: string): Promise<number | null> {
  const rows: Array<{ id: number }> = await manager.query(
    `SELECT "id" FROM "ledger_entry" WHERE "idempotencyKey" = $1`,
    [key.trim()],
  );
  return rows.length === 0 ? null : Number(rows[0].id);
}

/**
 * Compte (code, devise), cree au premier mouvement. Deux requetes : en READ
 * COMMITTED, le SELECT qui suit un ON CONFLICT voit la ligne validee par une
 * transaction concurrente.
 */
export async function ensureLedgerAccount(
  manager: EntityManager,
  account: LedgerAccountRef,
  currency: string,
): Promise<number> {
  await manager.query(
    `INSERT INTO "ledger_account" ("code", "kind", "ownerId", "currency")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("code", "currency") DO NOTHING`,
    [account.code, account.kind, account.ownerId ?? null, currency],
  );
  const rows: Array<{ id: number }> = await manager.query(
    `SELECT "id" FROM "ledger_account" WHERE "code" = $1 AND "currency" = $2`,
    [account.code, currency],
  );
  return Number(rows[0].id);
}

/**
 * Lignes d'une ecriture deja inseree. Exporte pour l'ouverture du grand livre
 * (ledger-open.ts), qui n'ecrit aucune ligne de portefeuille.
 */
export async function insertLedgerLines(
  manager: EntityManager,
  entryId: number,
  currency: string,
  lines: LedgerLineInput[],
): Promise<void> {
  const nonZero = lines.filter((line) => line.amount !== 0);
  if (nonZero.length === 0) {
    return;
  }
  // Comptes crees dans l'ordre des codes : pas d'interblocage entre deux
  // premieres ecritures concurrentes.
  const codes = [...new Set(nonZero.map((l) => l.account.code))].sort();
  const ids = new Map<string, number>();
  for (const code of codes) {
    const account = nonZero.find((l) => l.account.code === code)!.account;
    ids.set(code, await ensureLedgerAccount(manager, account, currency));
  }
  const params: unknown[] = [];
  const values = nonZero.map((line) => {
    params.push(entryId, ids.get(line.account.code), line.amount, line.nature);
    const n = params.length;
    return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
  });
  await manager.query(
    `INSERT INTO "ledger_line" ("entryId", "accountId", "amount", "nature") VALUES ${values.join(', ')}`,
    params,
  );
}

async function insertLines(
  manager: EntityManager,
  entryId: number,
  entry: LedgerEntryInput,
): Promise<void> {
  await insertLedgerLines(manager, entryId, entry.currency, entry.lines);
}

async function postWallets(
  manager: EntityManager,
  currency: string,
  lines: IndexedWalletLine[],
  entryId: number | null,
): Promise<LedgerWalletResult[]> {
  const results: LedgerWalletResult[] = new Array(lines.length);
  for (const line of lines) {
    const projection = projectionOf(line.account)!;
    const owner =
      projection.ownerColumn == null
        ? {}
        : { [projection.ownerColumn]: Number(line.account.ownerId) };
    const transaction: ObjectLiteral = {
      ...line.fields,
      ...owner,
      currency,
    };
    if (entryId != null) {
      transaction['ledgerEntryId'] = entryId;
    }
    const result = await postWalletOperation<ObjectLiteral, ObjectLiteral>(manager, {
      walletEntity: projection.walletEntity,
      transactionEntity: projection.transactionEntity,
      owner,
      currency,
      amount: line.amount,
      transaction,
      recordZeroAmount: projection.recordZeroAmount,
      guard: line.guard,
    });
    results[line.index] = {
      wallet: result.wallet,
      transactionId: result.transactionId,
      applied: result.applied,
    };
  }
  return results;
}

async function readWallets(
  manager: EntityManager,
  currency: string,
  lines: LedgerWalletLineInput[],
): Promise<LedgerWalletResult[]> {
  const results: LedgerWalletResult[] = [];
  for (const line of lines) {
    const projection = projectionOf(line.account);
    if (projection == null) {
      results.push({ wallet: null, applied: false });
      continue;
    }
    const where: ObjectLiteral = { currency };
    if (projection.ownerColumn != null) {
      where[projection.ownerColumn] = Number(line.account.ownerId);
    }
    const wallet = await manager.getRepository(projection.walletEntity).findOneBy(where);
    const key = line.fields['idempotencyKey'];
    let transactionId: number | undefined;
    if (key != null) {
      const existing = await manager
        .getRepository(projection.transactionEntity)
        .findOne({ where: { idempotencyKey: key } });
      transactionId = existing?.['id'];
    }
    results.push({ wallet, transactionId, applied: false });
  }
  return results;
}
