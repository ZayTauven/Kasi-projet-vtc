import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';

@InputType()
export class UpdateOrderInput {
  status?: OrderStatus;
  paidAmount?: number;
  @Field(() => Int)
  destinationArrivedTo?: number;
  /**
   * p3-mesures M4 (2026-10-22) : motif d'annulation (motifs `Driver`), lu
   * seulement avec `status: DriverCanceled`. Facultatif : un motif refuse
   * n'empeche pas l'annulation.
   */
  @Field(() => ID, { nullable: true })
  cancelReasonId?: number | string | null;
}
