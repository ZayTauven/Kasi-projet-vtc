import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { PayoutMethodType } from '@kasi/database/enums/payout-method-type.enum';

@ObjectType('PayoutMethod')
export class PayoutMethodDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField(() => PayoutMethodType)
  type!: PayoutMethodType;
  name!: string;
  @FilterableField()
  currency!: string;
  @FilterableField()
  enabled!: boolean;
  minimumAmount!: number;
  instructions?: string;
  createdAt!: Date;
}
