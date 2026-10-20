import { Field, InputType, PickType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { CarModelDTO } from './car-model.dto';

@InputType()
export class CarModelInput {
  @Field()
  name: string;
  @Field(() => VehicleType, { nullable: true })
  vehicleType?: VehicleType | null;
}
