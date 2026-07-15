import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PayoutMethodType } from "./enums/payout-method-type.enum";
import { DriverEntity } from "./driver.entity";
import { PayoutEntity } from "./payout.entity";

@Entity('payout_method')
export class PayoutMethodEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('enum', { enum: PayoutMethodType })
    type!: PayoutMethodType;

    @Column()
    name!: string;

    @Column('char', { length: 3 })
    currency!: string;

    @Column({ default: true })
    enabled!: boolean;

    // Sous ce solde, le driver n'est pas inclus dans les sessions de versement.
    @Column('numeric', {
        default: '0.00',
        precision: 10,
        scale: 2
    })
    minimumAmount!: number;

    // Consignes opérateur (ex. libellé du motif Wave, plafonds journaliers).
    @Column({ nullable: true })
    instructions?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @OneToMany(() => DriverEntity, driver => driver.payoutMethod)
    drivers!: DriverEntity[];

    @OneToMany(() => PayoutEntity, payout => payout.method)
    payouts!: PayoutEntity[];
}
