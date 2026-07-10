import {
  Authorize,
  FilterableField,
  IDField,
} from '@ptc-org/nestjs-query-graphql';
import { ID, InputType, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { RegionAuthorizer } from './region.authorizer';

@ObjectType('Region')
@Authorize(RegionAuthorizer)
export class RegionDTO {
  @IDField(() => ID)
  id!: number;
  name!: string;
  @FilterableField(() => String)
  currency!: string;
  enabled!: boolean;
  location: Point[][];
}
