import {
  Authorize,
  IDField,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { Point, TimeMultiplier } from '@kasi/database';
import { FleetDTO } from '../../fleet/dto/fleet.dto';
import { ServiceAuthorizer } from './service.authorizer';
import { ServiceDTO } from './service.dto';

@ObjectType('ZonePrice')
@UnPagedRelation('fleets', () => FleetDTO, {
  update: { enabled: true },
})
@UnPagedRelation('services', () => ServiceDTO, {
  update: { enabled: true },
})
@Authorize(ServiceAuthorizer)
export class ZonePriceDTO {
  @IDField(() => ID)
  id: number;
  name!: string;
  from!: Point[][];
  to!: Point[][];
  cost: number;
  timeMultipliers!: TimeMultiplier[];
}
