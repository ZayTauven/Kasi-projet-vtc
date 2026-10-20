import {
  IDField,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ServiceOrderType } from '@kasi/database/enums/service-order-type.enum';
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
  orderType!: ServiceOrderType;
  cost: number;
  costAfterCoupon?: number;
  /**
   * p2-argent I4 (2026-10-20) : devis de ce prix (getFare). Ajout facultatif :
   * une app qui le renvoie dans createOrder obtient exactement ce prix.
   */
  @Field(() => ID, { nullable: true })
  quoteId?: string;
  /** p2-argent I4 : fin de validite du devis (2 minutes). */
  quoteExpiresAt?: Date;
  cancellationTotalFee: number;
  @Field(() => Int)
  prepayPercent!: number;
  twoWayAvailable!: boolean;
}
