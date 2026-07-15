import {
  FilterableField,
  IDField,
  OffsetConnection,
  Relation,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PayoutSessionStatus } from '@kasi/database/enums/payout-session-status.enum';
import { OperatorDTO } from '../../operator/dto/operator.dto';
import { PayoutDTO } from './payout.dto';

@ObjectType('PayoutSession')
@OffsetConnection('payouts', () => PayoutDTO, { enableTotalCount: true })
@Relation('operator', () => OperatorDTO, { nullable: true })
export class PayoutSessionDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  createdAt!: Date;
  processedAt?: Date;
  @FilterableField(() => PayoutSessionStatus)
  status!: PayoutSessionStatus;
  @FilterableField()
  currency!: string;
  minimumAmount!: number;
  totalAmount!: number;
  description?: string;
  @Field(() => ID)
  operatorId?: number;
}
