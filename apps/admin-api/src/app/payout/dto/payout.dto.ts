import { FilterableField, IDField, Relation } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PayoutMethodType } from '@kasi/database/enums/payout-method-type.enum';
import { PayoutStatus } from '@kasi/database/enums/payout-status.enum';
import { DriverDTO } from '../../driver/dto/driver.dto';

@ObjectType('Payout')
@Relation('driver', () => DriverDTO)
export class PayoutDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  createdAt!: Date;
  @FilterableField(() => PayoutStatus)
  status!: PayoutStatus;
  amount!: number;
  currency!: string;
  methodType!: PayoutMethodType;
  methodName!: string;
  accountNumber?: string;
  processedAt?: Date;
  driverTransactionId?: number;
  @FilterableField(() => ID)
  sessionId!: number;
  @FilterableField(() => ID)
  driverId!: number;
  @Field(() => ID)
  methodId?: number;
}
