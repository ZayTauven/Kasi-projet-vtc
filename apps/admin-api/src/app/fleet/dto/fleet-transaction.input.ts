import { Field, ID, InputType } from '@nestjs/graphql';
import { ProviderDeductTransactionType } from '@kasi/database/enums/provider-deduct-transaction-type.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';

@InputType()
export class FleetTransactionInput {
    action: TransactionAction;
    deductType?: ProviderDeductTransactionType;
    rechargeType?: ProviderRechargeTransactionType;
    amount: number;
    currency: string;
    refrenceNumber?: string;
    @Field(() => ID)
    fleetId!: number;
    description?: string;
}