import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * p2-argent I3 (2026-10-19) : reglage du plafond et du seuil d'alerte d'une
 * devise. Les deux montants sont des entiers positifs, l'alerte strictement
 * inferieure au plafond (controle dans le resolveur).
 */
@InputType()
export class UpdateMoneyPolicyInput {
  /** Devise ISO 4217 (XOF au pilote). */
  @Field()
  currency!: string;

  @Field(() => Int)
  debtLimit!: number;

  @Field(() => Int)
  debtAlertThreshold!: number;
}
