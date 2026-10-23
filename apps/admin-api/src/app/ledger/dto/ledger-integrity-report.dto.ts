import { Field, Float, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

// Types GraphQL explicites (2026-10-21) : sans eux, le type se deduit des
// metadonnees de compilation, que ts-jest ne produit pas toujours selon
// l'ordre des fichiers (banc : « Cannot determine a GraphQL output type »).

/**
 * p2-argent I2 (2026-10-19) : rapport d'integrite du grand livre (fiche §3.9),
 * requete `ledgerIntegrityReport` d'admin-api. Ajout pur, lu par aucune app.
 */
@ObjectType('LedgerIntegrityIssue')
export class LedgerIntegrityIssueDTO {
  /** PROJECTION, UNLINKED_LINE, CURRENCY_TOTAL ou UNBALANCED_ENTRY. */
  @Field(() => String)
  kind!: string;

  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  walletTable?: string;

  @Field(() => Float, { nullable: true })
  walletBalance?: number;

  @Field(() => Float, { nullable: true })
  ledgerBalance?: number;

  @Field(() => Float, { nullable: true })
  difference?: number;

  @Field(() => Int, { nullable: true })
  count?: number;

  @Field(() => String)
  detail!: string;
}

@ObjectType('LedgerIntegrityReport')
export class LedgerIntegrityReportDTO {
  /** true : aucun ecart. */
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => Int)
  issueCount!: number;

  @Field(() => GraphQLISODateTime)
  checkedAt!: Date;

  /** Premiere ecriture d'ouverture ; null si le grand livre n'est pas ouvert. */
  @Field(() => GraphQLISODateTime, { nullable: true })
  openedAt?: Date;

  @Field(() => Int)
  entryCount!: number;

  @Field(() => Int)
  accountCount!: number;

  @Field(() => Int)
  walletCount!: number;

  @Field(() => [LedgerIntegrityIssueDTO])
  issues!: LedgerIntegrityIssueDTO[];
}
