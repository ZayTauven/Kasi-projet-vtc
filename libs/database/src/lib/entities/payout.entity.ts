import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DriverEntity } from "./driver.entity";
import { PayoutMethodType } from "./enums/payout-method-type.enum";
import { PayoutStatus } from "./enums/payout-status.enum";
import { PayoutMethodEntity } from "./payout-method.entity";
import { PayoutSessionEntity } from "./payout-session.entity";

// Versement individuel d'un Kasiman au sein d'une session. Les champs
// methodType/methodName/accountNumber sont des instantanés : la méthode ou
// le numéro du driver peuvent changer après coup sans altérer l'historique.
@Entity('payout')
export class PayoutEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @Column('enum', {
        enum: PayoutStatus,
        default: PayoutStatus.Pending
    })
    status!: PayoutStatus;

    @Column('numeric', {
        default: '0.00',
        precision: 10,
        scale: 2
    })
    amount!: number;

    @Column('char', { length: 3 })
    currency!: string;

    @Column('enum', { enum: PayoutMethodType })
    methodType!: PayoutMethodType;

    @Column()
    methodName!: string;

    // Numéro Wave/Orange Money ou compte bancaire du driver au moment de la
    // session ; null pour un versement en espèces.
    @Column({ nullable: true })
    accountNumber?: string;

    @Column({ nullable: true })
    processedAt?: Date;

    // Transaction wallet (Deduct/Withdraw) créée quand le payout est payé.
    @Column({ nullable: true })
    driverTransactionId?: number;

    @ManyToOne(() => PayoutSessionEntity, session => session.payouts, { onDelete: 'CASCADE' })
    session!: PayoutSessionEntity;

    @Column()
    sessionId!: number;

    @ManyToOne(() => DriverEntity, driver => driver.payouts)
    driver!: DriverEntity;

    @Column()
    driverId!: number;

    @ManyToOne(() => PayoutMethodEntity, method => method.payouts, { onDelete: 'SET NULL' })
    method?: PayoutMethodEntity;

    @Column({ nullable: true })
    methodId?: number;
}
