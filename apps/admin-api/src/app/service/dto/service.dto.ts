import {
  Authorize,
  FilterableField,
  IDField,
  PagingStrategies,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { DistanceMultiplier } from '@kasi/database';
import { TimeMultiplier } from '@kasi/database';
import { ServicePaymentMethod } from '@kasi/database/enums/service-payment-method.enum';
import { DateRangeMultiplier } from 'libs/database/src/lib/interfaces/date-range-multiplier.dto';
import { WeekdayMultiplier } from 'libs/database/src/lib/interfaces/weekday-multiplier.dto';
import { RegionDTO } from '../../region/dto/region.dto';
import { MediaDTO } from '../../upload/media.dto';
import { ServiceOptionDTO } from './service-option.dto';
import { ServiceAuthorizer } from './service.authorizer';

@ObjectType('Service')
@UnPagedRelation('regions', () => RegionDTO, {
  pagingStrategy: PagingStrategies.NONE,
  update: { enabled: true },
})
@Relation('media', () => MediaDTO)
@UnPagedRelation('options', () => ServiceOptionDTO, {
  update: { enabled: true },
})
@Authorize(ServiceAuthorizer)
export class ServiceDTO {
  @IDField(() => ID)
  id!: number;
  name!: string;
  description?: string;
  @Field(() => Int)
  personCapacity?: number;
  @FilterableField(() => ID)
  categoryId: number;
  baseFare!: number;
  roundingFactor?: number;
  perHundredMeters: number;
  perMinuteDrive!: number;
  perMinuteWait!: number;
  prepayPercent!: number;
  minimumFee!: number;
  @Field(() => Int)
  searchRadius!: number;
  paymentMethod!: ServicePaymentMethod;
  cancellationTotalFee!: number;
  cancellationDriverShare!: number;
  @Field(() => Int)
  providerSharePercent!: number;
  providerShareFlat!: number;
  twoWayAvailable!: boolean;
  @Field(() => Int)
  maximumDestinationDistance!: number;
  timeMultipliers!: TimeMultiplier[];
  distanceMultipliers!: DistanceMultiplier[];
  weekdayMultipliers!: WeekdayMultiplier[];
  dateRangeMultipliers!: DateRangeMultiplier[];
  @Field(() => ID)
  mediaId!: number;
}
