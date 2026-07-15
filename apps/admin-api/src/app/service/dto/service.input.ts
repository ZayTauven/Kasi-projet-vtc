import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { FilterableField } from '@ptc-org/nestjs-query-graphql';
import { TimeMultiplier, DistanceMultiplier } from '@kasi/database';
import { ServiceOrderType } from '@kasi/database/enums/service-order-type.enum';
import { ServicePaymentMethod } from '@kasi/database/enums/service-payment-method.enum';
import { DateRangeMultiplier } from 'libs/database/src/lib/interfaces/date-range-multiplier.dto';
import { WeekdayMultiplier } from 'libs/database/src/lib/interfaces/weekday-multiplier.dto';

@InputType()
export class ServiceInput {
  name!: string;
  description?: string;
  @Field(() => Int)
  personCapacity?: number;
  @FilterableField(() => ID)
  categoryId!: number;
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
  orderType?: ServiceOrderType;
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
