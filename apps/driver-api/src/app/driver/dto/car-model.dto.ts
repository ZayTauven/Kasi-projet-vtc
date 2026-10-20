import { IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';

@ObjectType('CarModel')
export class CarModelDTO {
  @IDField(() => ID)
  id: number;
  name: string;
  /** p2-vehicules : moto, taxi/voiture ou camionnette (null = non classe). */
  @Field(() => VehicleType, { nullable: true })
  vehicleType?: VehicleType | null;
}
