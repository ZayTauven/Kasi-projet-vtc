import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CouponInput {
  code: string;
  title: string;
  description: string;
  @Field(() => Int)
  manyUsersCanUse!: number;
  @Field(() => Int)
  manyTimesUserCanUse!: number;
  minimumCost!: number;
  maximumCost!: number;
  startAt!: Date;
  expireAt!: Date;
  @Field(() => Int)
  discountPercent!: number;
  @Field(() => Int)
  discountFlat!: number;
  creditGift!: number;
  isEnabled!: boolean;
  isFirstTravelOnly!: boolean;
}
