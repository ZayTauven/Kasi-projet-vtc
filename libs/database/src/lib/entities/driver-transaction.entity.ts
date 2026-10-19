import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DriverEntity } from "./driver.entity";
import { DriverDeductTransactionType } from "./enums/driver-deduct-transaction-type.enum";
import { DriverRechargeTransactionType } from "./enums/driver-recharge-transaction-type.enum";
import { TransactionAction } from "./enums/transaction-action.enum";
import { TransactionStatus } from "./enums/transaction-status.enum";
import { OperatorEntity } from "./operator.entity";
import { RequestEntity } from "./request.entity";
import { PaymentGatewayEntity } from "./payment-gateway.entity";

@Entity('driver_transaction')
export class DriverTransactionEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn({name: 'transactionTime'})
    createdAt!: Date;

    @Column('enum', {
        enum: TransactionStatus,
        default: TransactionStatus.Processing
    })
    status!: TransactionStatus;

    @Column('enum', { enum: TransactionAction })
    action!: TransactionAction;

    @Column('enum', {
        enum: DriverDeductTransactionType,
        nullable: true
    })
    deductType?: DriverDeductTransactionType;

    @Column('enum', {
        enum: DriverRechargeTransactionType,
        nullable: true
    })
    rechargeType?: DriverRechargeTransactionType;

    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      default: () => '0.00', // DEFAULT 0.00 brut, comme en base (sinon faux ecart perpetuel de migration:generate)
        precision: 10,
        scale: 2
    })
    amount!: number;

    @Column('char' , { length: '3'})
    currency!: string;

    @Column({ nullable: true, name: 'documentNumber' })
    refrenceNumber?: string;

    @Column({ nullable: true, name: 'details' })
    description?: string;

    @ManyToOne(() => DriverEntity, driver => driver.transactions)
    driver!: DriverEntity;

    @Column()
    driverId!: number;

    @ManyToOne(() => PaymentGatewayEntity, gateway => gateway.riderTransactions)
    paymentGateway?: PaymentGatewayEntity;

    @Column({ nullable: true })
    paymentGatewayId?: number;

    @ManyToOne(() => OperatorEntity, operator => operator.driverTransactions)
    operator?: OperatorEntity;

    @Column({ nullable: true })
    operatorId?: number;

    @ManyToOne(() => RequestEntity, order => order.driverTransactions)
    request?: RequestEntity;

    @Column({ nullable: true })
    requestId?: number;

    /**
     * p1-unicite : cle d'unicite de l'operation d'argent, derivee cote serveur
     * (voir MoneyKey dans libs/database/src/lib/order/wallet-ledger.ts). Un rejeu
     * portant la meme cle n'insere rien et ne touche pas au solde. NULL pour
     * l'historique anterieur au 2026-09-29 et les operations manuelles sans cle
     * (PostgreSQL admet plusieurs NULL dans un index unique).
     */
    @Index('IDX_driver_transaction_idempotencyKey', { unique: true })
    @Column('varchar', { length: 128, nullable: true })
    idempotencyKey?: string | null;
}