import { Authorize, FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GiftCardAuthorizer } from './gift-card.authorizer';

// DTO de lecture des CODES de cartes cadeaux. L'authorizer impose
// GiftCards_ViewCodes : l'exposition des codes (top-level ou via la relation
// batch->giftCards) est protégée par une permission dédiée, distincte de la
// simple consultation des lots (GiftCards_View).
@ObjectType('GiftCard')
@Authorize(GiftCardAuthorizer)
export class GiftCardDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  code!: string;
  @FilterableField()
  currency!: string;
  @Field(() => Float)
  amount!: number;
  @FilterableField()
  isUsed!: boolean;
  @Field({ nullable: true })
  availableTimestamp?: Date;
  @Field({ nullable: true })
  expirationTimestamp?: Date;
  @Field(() => ID, { nullable: true })
  batchId?: number;
}
