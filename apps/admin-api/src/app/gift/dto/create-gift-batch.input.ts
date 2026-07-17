import { Field, Float, Int, InputType } from '@nestjs/graphql';

@InputType()
export class CreateGiftBatchInput {
  @Field()
  name!: string;
  @Field()
  currency!: string;
  @Field(() => Float)
  amount!: number;
  @Field(() => Int)
  quantity!: number;
  // Hérités par chaque code généré (facultatifs).
  @Field({ nullable: true })
  availableTimestamp?: Date;
  @Field({ nullable: true })
  expirationTimestamp?: Date;
}
