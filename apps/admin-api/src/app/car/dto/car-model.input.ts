import { Field, InputType, PickType } from '@nestjs/graphql';
import { CarModelDTO } from './car-model.dto';

@InputType()
export class CarModelInput {
  @Field()
  name: string;
}
