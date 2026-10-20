import { IDField, Relation } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { ServiceOrderType } from '@kasi/database/enums/service-order-type.enum';
import { ServicePaymentMethod } from '@kasi/database/enums/service-payment-method.enum';
import { MediaDTO } from '../../upload/media.dto';

@ObjectType('Service')
@Relation('media', () => MediaDTO)
export class ServiceDTO {
  @IDField(() => ID)
  id: number;
  name: string;
  paymentMethod: ServicePaymentMethod;
  orderType!: ServiceOrderType;
  /** p2-vehicules : vehicules admis (vide = tous). */
  @Field(() => [VehicleType])
  vehicleTypes!: VehicleType[];
  cancellationTotalFee!: number;
}
