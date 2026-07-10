import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ProviderDeductTransactionType } from '@kasi/database/enums/provider-deduct-transaction-type.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';

@ObjectType('ProviderTransaction')
export class ProviderTransactionDTO {
  @IDField(() => ID)
  id: number;
  createdAt!: Date;
  @Field(() => TransactionAction)
  action: TransactionAction;
  @Field(() => ProviderDeductTransactionType)
  deductType?: ProviderDeductTransactionType;
  @Field(() => ProviderRechargeTransactionType)
  rechargeType?: ProviderRechargeTransactionType;
  amount: number;
  currency: string;
  refrenceNumber?: string;
  description?: string;
  @FilterableField(() => ID)
  operatorId?: number;
  @FilterableField(() => ID)
  requestId?: number;
}
