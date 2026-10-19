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

    /**
     * p1-unicite (optionnel, additif) : cle fournie par le back-office pour
     * qu'un double envoi du meme formulaire ne soit ecrit qu'une fois. Sans cle,
     * chaque appel ecrit une operation (comportement historique).
     */
    @Field({ nullable: true })
    idempotencyKey?: string;
}
