import { Field, ID, InputType, Int } from '@nestjs/graphql';

/**
 * p2-argent I3 (2026-10-19, fiche argent §4.4) : reglement de la dette d'un
 * Kasiman par un operateur (especes deposees au siege ou chez un relais Kasi,
 * contre recu). Ecriture `CAISSE:<lieu> -x / KASIMAN:<id> +x`, cle
 * `debt-settlement:<idempotencyKey>`.
 */
@InputType()
export class SettleDriverDebtInput {
  @Field(() => ID)
  driverId!: number;

  /** Montant regle, entier positif (FCFA), au plus la dette du moment. */
  @Field(() => Int)
  amount!: number;

  @Field(() => String)
  currency!: string;

  /** Numero du recu remis au Kasiman. */
  @Field(() => String)
  receiptNumber!: string;

  @Field(() => String)
  motif!: string;

  /** Lieu de la caisse : SIEGE par defaut (compte CAISSE:<lieu>). */
  @Field(() => String, { nullable: true })
  location?: string;

  /**
   * Cle fournie par le panel (une par formulaire) : un double envoi ne
   * credite qu'une fois.
   */
  @Field(() => String)
  idempotencyKey!: string;
}
