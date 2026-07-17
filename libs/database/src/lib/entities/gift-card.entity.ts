import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { GiftBatchEntity } from "./gift-batch.entity";
import { RiderTransactionEntity } from "./rider-transaction.entity";

@Entity('gift_card')
export class GiftCardEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    code!: string;
    
    @Column('varchar', {
        length: 3
    })
    currency!: string;

    @Column('numeric', {
        precision: 10,
        scale: 2
    })
    amount!: number;

    @Column()
    isUsed!: boolean;

    @Column()
    availableTimestamp?: Date;

    @Column()
    expirationTimestamp?: Date;

    @OneToOne(() => RiderTransactionEntity, riderTransaction => riderTransaction.giftCard)
    riderTransaction?: RiderTransactionEntity;

    // Rattachement au lot de génération (P6.1). Nullable et rétro-compatible :
    // les gift cards historiques créées hors lot restent valides et
    // consommables via redeemGiftCard (rider-api).
    @Column({ nullable: true })
    batchId?: number;

    @ManyToOne(() => GiftBatchEntity, batch => batch.giftCards, { nullable: true })
    @JoinColumn({ name: 'batchId' })
    batch?: GiftBatchEntity;
}