import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { GiftCardEntity } from "./gift-card.entity";

// Lot de cartes cadeaux : à la création, `quantity` GiftCardEntity sont
// générées avec des codes uniques, héritant currency/amount/available/
// expiration du lot. Les codes sont ensuite consommés via redeemGiftCard
// (rider-api), inchangé. Un lot n'est qu'un regroupement de génération ;
// les gift cards historiques sans lot restent valides (batchId nullable).
@Entity('gift_batch')
export class GiftBatchEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('varchar')
    name!: string;

    @Column('varchar', {
        length: 3
    })
    currency!: string;

    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      precision: 10,
        scale: 2
    })
    amount!: number;

    @Column('int')
    quantity!: number;

    @Column({ nullable: true })
    availableTimestamp?: Date;

    @Column({ nullable: true })
    expirationTimestamp?: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => GiftCardEntity, giftCard => giftCard.batch)
    giftCards!: GiftCardEntity[];
}
