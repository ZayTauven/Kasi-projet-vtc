import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { RiderAddressType } from '@kasi/database/enums/rider-address-type.enum';

@ObjectType('RiderAddress')
export class RiderAddressDTO {
  @IDField(() => ID)
  id: number;
  type: RiderAddressType;
  title: string;
  details?: string;
  location: Point;
  @FilterableField(() => ID)
  riderId: number;
}
