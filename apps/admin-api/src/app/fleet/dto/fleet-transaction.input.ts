import { Field, ID, InputType } from '@nestjs/graphql';
import { ProviderDeductTransactionType } from '@kasi/database/enums/provider-deduct-transaction-type.enum';
import { ProviderRechargeTransactionType } from '@kasi/database/enums/provider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { ManualCounterparty } from '../../ledger/dto/manual-counterparty.enum';

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

    /**
     * p2-argent I2 (2026-10-19, optionnel, additif) : contrepartie au grand
     * livre. Absente : KASI:CORRECTIONS.
     */
    @Field(() => ManualCounterparty, { nullable: true })
    counterparty?: ManualCounterparty;

    /**
     * p2-argent I2 (2026-10-19, optionnel, additif) : motif inscrit sur
     * l'ecriture. Absent : la description, sinon un motif generique.
     */
    @Field({ nullable: true })
    motif?: string;
}
