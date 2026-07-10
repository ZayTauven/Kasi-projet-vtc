import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CarColorInput {
  @Field()
  name: string;
}
