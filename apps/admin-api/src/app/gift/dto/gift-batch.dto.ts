import {
  Authorize,
  FilterableField,
  IDField,
  OffsetConnection,
} from '@ptc-org/nestjs-query-graphql';
import { Field, Float, Int, ID, ObjectType } from '@nestjs/graphql';
import { GiftBatchAuthorizer } from './gift-batch.authorizer';
import { GiftCardDTO } from './gift-card.dto';

// Lot de cartes cadeaux (lecture). Créé uniquement via createGiftBatch
// (GiftResolver). La connexion giftCards expose les codes générés : elle est
// protégée par l'authorizer de GiftCardDTO (GiftCards_ViewCodes).
@ObjectType('GiftBatch')
@OffsetConnection('giftCards', () => GiftCardDTO, { enableTotalCount: true })
@Authorize(GiftBatchAuthorizer)
export class GiftBatchDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  name!: string;
  @FilterableField()
  currency!: string;
  @Field(() => Float)
  amount!: number;
  @Field(() => Int)
  quantity!: number;
  @Field({ nullable: true })
  availableTimestamp?: Date;
  @Field({ nullable: true })
  expirationTimestamp?: Date;
  @FilterableField()
  createdAt!: Date;
}
