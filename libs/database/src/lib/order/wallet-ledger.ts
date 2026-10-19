import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * p1-unicite (2026-09-29) : ecriture d'une operation d'argent sur un
 * portefeuille (rider, driver, fleet, provider), une seule fois.
 *
 * Avant : lecture du solde, puis `UPDATE ... SET amount = <lu> + x`, puis
 * `save()` de la ligne de transaction sans `await`. Un appel rejoue (timeout
 * mobile, retour de passerelle recu deux fois, double clic) creditait a nouveau ;
 * deux ecritures simultanees sur le meme portefeuille en perdaient une.
 *
 * Maintenant, dans UNE transaction PostgreSQL :
 * 1. verrou consultatif de transaction sur le portefeuille (proprietaire +
 *    devise) : les ecritures d'un meme portefeuille passent l'une apres l'autre
 *    (y compris la creation du portefeuille, qui n'a pas d'index unique) ;
 * 2. insertion de la ligne de transaction avec sa cle d'unicite
 *    (`idempotencyKey`, index unique) en `ON CONFLICT DO NOTHING` : un rejeu
 *    n'insere rien et ne touche pas au solde, sans lever d'erreur ;
 * 3. increment atomique du solde (`amount = amount + x`), ou creation du
 *    portefeuille.
 *
 * La cle est toujours derivee cote serveur (reference de passerelle, id de
 * course + nature de l'operation, id de versement...) : les apps installees
 * n'en envoient pas. Sans cle (credit manuel sans cle fournie), l'operation est
 * ecrite a chaque appel, comme avant, mais le solde reste exact en concurrence.
 *
 * Hors perimetre : grand livre en partie double et dette especes (p2-argent).
 */
export interface WalletPosting<T extends ObjectLiteral> {
  /** Entite de portefeuille (RiderWalletEntity, DriverWalletEntity...). */
  walletEntity: EntityTarget<ObjectLiteral>;
  /** Entite de transaction (RiderTransactionEntity...). */
  transactionEntity: EntityTarget<T>;
  /** Colonnes qui identifient le portefeuille, hors devise ({} pour le provider). */
  owner: Record<string, number>;
  currency: string;
  /** Montant signe (credit > 0, debit < 0). */
  amount: number;
  /** Ligne de transaction a inserer (sans id). */
  transaction: ObjectLiteral;
  /** false : pas de ligne si le montant est nul (comportement historique driver/provider). */
  recordZeroAmount: boolean;
  /**
   * Controle execute sous verrou, avant toute ecriture, avec le solde courant
   * (ex. solde suffisant pour un versement). Lever une erreur annule tout.
   */
  guard?: (currentBalance: number) => void;
}

export interface WalletPostingResult<W> {
  wallet: W;
  /** false : cle deja connue, rien n'a ete ecrit (rejeu absorbe). */
  applied: boolean;
  /** id de la ligne de transaction inseree (ou existante en cas de rejeu). */
  transactionId?: number;
}

export async function postWalletOperation<
  W extends ObjectLiteral,
  T extends ObjectLiteral,
>(
  manager: EntityManager,
  posting: WalletPosting<T>,
): Promise<WalletPostingResult<W>> {
  if (!manager.queryRunner?.isTransactionActive) {
    return manager.transaction((m) => postWalletOperation<W, T>(m, posting));
  }
  const walletRepo = manager.getRepository(posting.walletEntity);
  const walletMeta = walletRepo.metadata;
  const balanceColumn =
    walletMeta.findColumnWithPropertyName('balance')!.databaseName;
  const amount = parseFloat(`${posting.amount}`);
  const where = { ...posting.owner, currency: posting.currency };

  const ownerKey = Object.keys(posting.owner)
    .sort()
    .map((key) => `${key}=${posting.owner[key]}`)
    .join(',');
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    `kasi-wallet:${walletMeta.tableName}:${ownerKey}:${posting.currency}`,
  ]);

  let wallet = (await walletRepo.findOneBy(where)) as W | null;
  const currentBalance = wallet == null ? 0 : Number(wallet['balance']);
  posting.guard?.(currentBalance);

  let applied = true;
  let transactionId: number | undefined;
  if (amount !== 0 || posting.recordZeroAmount) {
    const insert = await manager
      .createQueryBuilder()
      .insert()
      .into(posting.transactionEntity)
      .values({ ...posting.transaction, amount } as never)
      .orIgnore()
      .returning('id')
      .execute();
    const rows: Array<{ id: number }> = Array.isArray(insert.raw)
      ? insert.raw
      : [];
    if (rows.length === 0) {
      applied = false;
      const key = posting.transaction['idempotencyKey'];
      if (key != null) {
        const existing = (await manager
          .getRepository(posting.transactionEntity)
          .findOne({ where: { idempotencyKey: key } as never })) as unknown as
          | { id: number }
          | null;
        transactionId = existing?.id;
      }
    } else {
      transactionId = rows[0].id;
    }
  }

  if (applied && amount !== 0 && wallet != null) {
    await manager
      .createQueryBuilder()
      .update(posting.walletEntity)
      .set({ balance: () => `"${balanceColumn}" + :delta` } as never)
      .setParameter('delta', amount)
      .where(where)
      .execute();
  }
  if (wallet == null) {
    // Historique : le portefeuille est cree au premier mouvement, meme nul.
    await walletRepo.insert({ ...where, balance: applied ? amount : 0 });
  }
  wallet = (await walletRepo.findOneByOrFail(where)) as W;
  return { wallet, applied, transactionId };
}

/** Cles d'unicite derivees cote serveur (un seul endroit pour les formats). */
export const MoneyKey = {
  /** Retour de passerelle de paiement (payment_result) : reference de la passerelle. */
  gatewayPayment: (gatewayId: number | string | undefined, transactionNumber: string) =>
    `payment:${gatewayId ?? 'none'}:${transactionNumber}`,
  /** Operation liee a une course (fin de course, frais d'annulation...). */
  order: (orderId: number, operation: string) => `order:${orderId}:${operation}`,
  /** Versement d'un Kasiman (payout). */
  payout: (payoutId: number) => `payout:${payoutId}`,
  /** Carte cadeau utilisee. */
  giftCard: (giftCardId: number) => `gift-card:${giftCardId}`,
  /** Operation manuelle du back-office, cle fournie par le client (optionnelle). */
  operator: (clientKey: string) => `operator:${clientKey}`,
};

/**
 * Cle optionnelle envoyee par le back-office (champ `idempotencyKey` des
 * entrees createXxxTransaction) : prefixee pour ne jamais rencontrer une cle
 * serveur. Absente ou vide : undefined (operation ecrite a chaque appel).
 */
export function operatorIdempotencyKey(
  clientKey?: string | null,
): string | undefined {
  const key = clientKey?.trim();
  if (key == null || key === '') {
    return undefined;
  }
  if (key.length > 100) {
    throw new Error('IDEMPOTENCY_KEY_TOO_LONG');
  }
  return MoneyKey.operator(key);
}
