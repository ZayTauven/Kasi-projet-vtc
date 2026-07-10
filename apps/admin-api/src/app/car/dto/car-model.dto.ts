import { Authorize, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { CarAuthorizer } from './car.authorizer';

@ObjectType('CarModel')
@Authorize(CarAuthorizer)
export class CarModelDTO {
  @IDField(() => ID)
  id: number;
  name: string;
}
