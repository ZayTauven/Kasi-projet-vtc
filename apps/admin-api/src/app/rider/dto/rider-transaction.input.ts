import { Field, ID, InputType } from "@nestjs/graphql";
import { RiderDeductTransactionType } from "@kasi/database/enums/rider-deduct-transaction-type.enum";
import { RiderRechargeTransactionType } from "@kasi/database/enums/rider-recharge-transaction-type.enum";
import { TransactionAction } from "@kasi/database/enums/transaction-action.enum";

@InputType()
export class RiderTransactionInput {
    action: TransactionAction;
    deductType?: RiderDeductTransactionType;
    rechargeType?: RiderRechargeTransactionType;
    amount: number;
    currency: string;
    refrenceNumber?: string;
    description?: string;
    @Field(() => ID)
    riderId!: number;

    /**
     * p1-unicite (optionnel, additif) : cle fournie par le back-office pour
     * qu'un double envoi du meme formulaire ne soit ecrit qu'une fois. Sans cle,
     * chaque appel ecrit une operation (comportement historique).
     */
    @Field({ nullable: true })
    idempotencyKey?: string;
}
