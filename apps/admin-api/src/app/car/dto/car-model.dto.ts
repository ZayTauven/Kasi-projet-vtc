import { Authorize, FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { CarAuthorizer } from './car.authorizer';

@ObjectType('CarModel')
@Authorize(CarAuthorizer)
export class CarModelDTO {
  @IDField(() => ID)
  id: number;
  name: string;
  /** p2-vehicules : moto, taxi/voiture ou camionnette (null = non classe). */
  @FilterableField(() => VehicleType, { nullable: true })
  vehicleType?: VehicleType | null;
}
