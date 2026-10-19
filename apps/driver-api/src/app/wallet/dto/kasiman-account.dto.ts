import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * p2-argent I3 (2026-10-19) : types AJOUTES au schema de driver-api (fiche
 * argent §6.2). Aucun champ existant modifie : les apps installees ne les
 * demandent pas et ne voient rien.
 */
@ObjectType('KasimanAccount')
export class KasimanAccountDTO {
  @Field(() => String)
  currency!: string;

  /** Solde du portefeuille (negatif = dette). */
  @Field(() => Float)
  balance!: number;

  /** Dette (>= 0) : partie negative du solde. */
  @Field(() => Float)
  debt!: number;

  /** Plafond de dette ; null si aucune politique pour la devise. */
  @Field(() => Float, { nullable: true })
  debtLimit?: number | null;

  /** Seuil d'alerte ; null si aucune politique pour la devise. */
  @Field(() => Float, { nullable: true })
  debtAlertThreshold?: number | null;

  /** OK, ALERT ou BLOCKED (chaine : de nouvelles valeurs restent lisibles). */
  @Field(() => String)
  level!: string;

  /** true : au-dela du plafond, plus aucune offre ni acceptation. */
  @Field(() => Boolean)
  blocked!: boolean;

  /** true : seuil d'alerte atteint (bandeau). */
  @Field(() => Boolean)
  alert!: boolean;
}

@ObjectType('KasimanStatementItem')
export class KasimanStatementItemDTO {
  @Field(() => ID)
  entryId!: number;

  @Field(() => Date)
  createdAt!: Date;

  /** Nature de l'ecriture : FIN_COURSE, ANNULATION, REGLEMENT_DETTE, VERSEMENT... */
  @Field(() => String)
  nature!: string;

  @Field(() => ID, { nullable: true })
  requestId?: number | null;

  /** Prix de la course, pour une ecriture de course. */
  @Field(() => Float, { nullable: true })
  orderPrice?: number | null;

  /** Especes encaissees par le Kasiman (fin de course). */
  @Field(() => Float, { nullable: true })
  cashCollected?: number | null;

  /** Montants signes du point de vue du Kasiman (positif = il recoit). */
  @Field(() => Float)
  onlinePaid!: number;

  @Field(() => Float)
  commission!: number;

  @Field(() => Float)
  tip!: number;

  @Field(() => Float)
  addedStop!: number;

  @Field(() => Float)
  settlement!: number;

  @Field(() => Float)
  other!: number;

  /** Mouvement net de l'ecriture sur le compte du Kasiman. */
  @Field(() => Float)
  amount!: number;

  /** Solde du compte apres l'ecriture. */
  @Field(() => Float)
  balanceAfter!: number;

  /** Reference externe (numero de recu d'un reglement...). */
  @Field(() => String, { nullable: true })
  reference?: string | null;

  @Field(() => String, { nullable: true })
  motif?: string | null;
}

@ObjectType('KasimanStatement')
export class KasimanStatementDTO {
  @Field(() => String)
  currency!: string;

  @Field(() => Int)
  totalCount!: number;

  @Field(() => [KasimanStatementItemDTO])
  items!: KasimanStatementItemDTO[];
}
