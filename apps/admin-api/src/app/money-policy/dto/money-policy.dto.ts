import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * p2-argent I3 (2026-10-19, fiche argent §4.1) : politique d'argent d'une
 * devise, lue et reglee depuis le panel. Ajout pur, lu par aucune app mobile.
 */
@ObjectType('MoneyPolicy')
export class MoneyPolicyDTO {
  @Field(() => ID)
  id!: number;

  @Field()
  currency!: string;

  /** Plafond de dette (unites entieres de la devise) : bloque au-dela. */
  @Field(() => Int)
  debtLimit!: number;

  /** Seuil d'alerte (unites entieres) : alerte a partir de ce montant. */
  @Field(() => Int)
  debtAlertThreshold!: number;

  @Field(() => Int, { nullable: true })
  updatedByOperatorId?: number | null;

  @Field()
  updatedAt!: Date;
}
