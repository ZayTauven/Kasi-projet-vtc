import {
  FilterableField,
  IDField,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { SOSStatus } from '@kasi/database/enums/sos-status.enum';
import { OrderDTO } from '../../order/dto/order.dto';
import { SOSActivityDTO } from './sos-activity.dto';

@ObjectType('DistressSignal')
@UnPagedRelation('activities', () => SOSActivityDTO)
@Relation('order', () => OrderDTO, { relationName: 'request' })
export class SOSDTO {
  @IDField(() => ID)
  id: number;
  createdAt: Date;
  @FilterableField(() => SOSStatus)
  status: SOSStatus;
  location?: Point;
  submittedByRider!: boolean;
  requestId: number;
}
