import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { SmsProviderType } from "./enums/sms-provider-type.enum";

@Entity('sms_provider')
export class SmsProviderEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('enum', { enum: SmsProviderType })
    type!: SmsProviderType;

    @Column()
    name!: string;

    @Column({ default: true })
    enabled!: boolean;

    // Un seul provider par défaut à la fois (géré par setDefaultSmsProvider).
    @Column({ default: false })
    isDefault!: boolean;

    // SID de compte Twilio / client_id Orange Developer.
    @Column({ nullable: true })
    accountId?: string;

    // Secret write-only : jamais exposé dans le DTO de lecture SmsProvider.
    @Column({ nullable: true })
    apiSecret?: string;

    @Column({ nullable: true })
    senderId?: string;

    @Column({ default: 'Your Kasi verification code is: %code%' })
    verificationTemplate!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
