import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/**
 * p2-argent I2 (2026-10-19) : rapport d'integrite du grand livre (fiche §3.9),
 * requete `ledgerIntegrityReport` d'admin-api. Ajout pur, lu par aucune app.
 */
@ObjectType('LedgerIntegrityIssue')
export class LedgerIntegrityIssueDTO {
  /** PROJECTION, UNLINKED_LINE, CURRENCY_TOTAL ou UNBALANCED_ENTRY. */
  @Field()
  kind!: string;

  @Field({ nullable: true })
  account?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  walletTable?: string;

  @Field(() => Float, { nullable: true })
  walletBalance?: number;

  @Field(() => Float, { nullable: true })
  ledgerBalance?: number;

  @Field(() => Float, { nullable: true })
  difference?: number;

  @Field(() => Int, { nullable: true })
  count?: number;

  @Field()
  detail!: string;
}

@ObjectType('LedgerIntegrityReport')
export class LedgerIntegrityReportDTO {
  /** true : aucun ecart. */
  @Field()
  ok!: boolean;

  @Field(() => Int)
  issueCount!: number;

  @Field()
  checkedAt!: Date;

  /** Premiere ecriture d'ouverture ; null si le grand livre n'est pas ouvert. */
  @Field({ nullable: true })
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
