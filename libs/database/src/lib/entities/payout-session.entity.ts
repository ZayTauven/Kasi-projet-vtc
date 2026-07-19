import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PayoutSessionStatus } from "./enums/payout-session-status.enum";
import { OperatorEntity } from "./operator.entity";
import { PayoutEntity } from "./payout.entity";

// Session de versement par lot : à la création, un Payout est généré pour
// chaque Kasiman éligible (solde >= minimum, méthode de retrait active).
// Le paiement effectif (Wave/OM/virement/espèces) reste manuel : l'opérateur
// marque chaque payout comme payé, ce qui débite le wallet du driver.
@Entity('payout_session')
export class PayoutSessionEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ nullable: true })
    processedAt?: Date;

    @Column('enum', {
        enum: PayoutSessionStatus,
        default: PayoutSessionStatus.Pending
    })
    status!: PayoutSessionStatus;

    @Column('char', { length: 3 })
    currency!: string;

    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      default: '0.00',
        precision: 10,
        scale: 2
    })
    minimumAmount!: number;

    // Somme des payouts générés à la création (instantané).
    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      default: '0.00',
        precision: 12,
        scale: 2
    })
    totalAmount!: number;

    @Column({ nullable: true })
    description?: string;

    @ManyToOne(() => OperatorEntity)
    operator?: OperatorEntity;

    @Column({ nullable: true })
    operatorId?: number;

    @OneToMany(() => PayoutEntity, payout => payout.session)
    payouts!: PayoutEntity[];
}
