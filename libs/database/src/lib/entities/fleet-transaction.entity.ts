import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DriverEntity } from './driver.entity';
import { ProviderDeductTransactionType } from './enums/provider-deduct-transaction-type.enum';
import { ProviderRechargeTransactionType } from './enums/provider-recharge-transaction-type.enum';
import { TransactionAction } from './enums/transaction-action.enum';
import { FleetEntity } from './fleet.entity';
import { OperatorEntity } from './operator.entity';
import { RequestEntity } from './request.entity';


@Entity('fleet_transaction')
export class FleetTransactionEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn({name: 'transactionTime'})
    transactionTimestamp!: Date;

    // @Column('enum', {
    //     enum: TransactionStatus,
    //     default: TransactionStatus.Processing
    // })
    // status!: TransactionStatus;

    @Column('enum', { enum: TransactionAction })
    action!: TransactionAction;

    @Column('enum', {
        enum: ProviderDeductTransactionType,
        nullable: true
    })
    deductType?: ProviderDeductTransactionType;

    @Column('enum', {
        enum: ProviderRechargeTransactionType,
        nullable: true
    })
    rechargeType?: ProviderRechargeTransactionType;

    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      default: () => '0.00', // DEFAULT 0.00 brut, comme en base (sinon faux ecart perpetuel de migration:generate)
        precision: 10,
        scale: 2
     })
    amount!: number;

    @Column('char', { length: '3' })
    currency!: string;

    @Column({ nullable: true, name: 'documentNumber' })
    refrenceNumber?: string;

    @Column({ nullable: true, name: 'details' })
    description?: string;

    @ManyToOne(() => RequestEntity, order => order.fleetTransactions)
    request?: RequestEntity;

    @Column({ nullable: true })
    requestId?: number;

    @ManyToOne(() => DriverEntity, driver => driver.fleetTransactions)
    driver?: DriverEntity;

    @Column({ nullable: true })
    driverId?: number;

    @ManyToOne(() => FleetEntity, fleet => fleet.transactions)
    fleet!: FleetEntity;

    @Column()
    fleetId!: number;

    @ManyToOne(() => OperatorEntity, operator => operator.fleetTransactions)
    operator?: OperatorEntity;

    @Column({ nullable: true, name: 'operatorId' })
    operatorId?: number;

    /**
     * p1-unicite : cle d'unicite de l'operation d'argent, derivee cote serveur
     * (voir MoneyKey dans libs/database/src/lib/order/wallet-ledger.ts). Un rejeu
     * portant la meme cle n'insere rien et ne touche pas au solde. NULL pour
     * l'historique anterieur au 2026-09-29 et les operations manuelles sans cle
     * (PostgreSQL admet plusieurs NULL dans un index unique).
     */
    @Index('IDX_fleet_transaction_idempotencyKey', { unique: true })
    @Column('varchar', { length: 128, nullable: true })
    idempotencyKey?: string | null;
}