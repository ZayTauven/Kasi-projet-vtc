import {
  IDField,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ServicePaymentMethod } from '@kasi/database/enums/service-payment-method.enum';
import { MediaDTO } from '../../upload/media.dto';
import { ServiceOptionDTO } from './service-option.dto';

@ObjectType('Service')
@Relation('media', () => MediaDTO)
@UnPagedRelation('options', () => ServiceOptionDTO)
export class ServiceDTO {
  @IDField(() => ID)
  id!: number;
  name!: string;
  description?: string;
  @Field(() => Int)
  personCapacity?: number;
  paymentMethod: ServicePaymentMethod;
  cost: number;
  costAfterCoupon?: number;
  cancellationTotalFee: number;
  @Field(() => Int)
  prepayPercent!: number;
  twoWayAvailable!: boolean;
}
