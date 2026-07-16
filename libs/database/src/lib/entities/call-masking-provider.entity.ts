import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CallMaskingProviderType } from "./enums/call-masking-provider-type.enum";

// Miroir de SmsProviderEntity, appliqué au call masking (appels anonymisés
// Kasiman <-> passager). Entité SÉPARÉE de sms_provider (décision d'archi).
@Entity('call_masking_provider')
export class CallMaskingProviderEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('enum', { enum: CallMaskingProviderType })
    type!: CallMaskingProviderType;

    @Column()
    name!: string;

    @Column({ default: true })
    enabled!: boolean;

    // Un seul provider par défaut à la fois (géré par setDefaultCallMaskingProvider).
    @Column({ default: false })
    isDefault!: boolean;

    // SID de compte Twilio.
    @Column({ nullable: true })
    accountId?: string;

    // Secret write-only : jamais exposé dans le DTO de lecture CallMaskingProvider.
    @Column({ nullable: true })
    apiSecret?: string;

    // Numéro proxy Twilio au format E.164 (celui que les 2 parties composent).
    @Column({ nullable: true })
    proxyNumber?: string;

    // Write-only : auth token Twilio, sert à valider la signature X-Twilio-Signature
    // du webhook voix entrant. Absent du DTO de lecture.
    @Column({ nullable: true })
    webhookAuthToken?: string;

    // Durée de vie d'une session de masquage (en minutes), TTL de la clé Redis.
    @Column({ default: 120 })
    sessionTtlMinutes!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
