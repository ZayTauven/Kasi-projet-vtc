import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EmailProviderType } from "./enums/email-provider-type.enum";

@Entity('email_provider')
export class EmailProviderEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('enum', { enum: EmailProviderType })
    type!: EmailProviderType;

    @Column()
    name!: string;

    @Column({ default: true })
    enabled!: boolean;

    // Un seul provider par défaut à la fois (géré par setDefaultEmailProvider).
    @Column({ default: false })
    isDefault!: boolean;

    // Hôte SMTP (ex: smtp.gmail.com).
    @Column({ nullable: true })
    host?: string;

    // Port SMTP (ex: 587 STARTTLS, 465 SSL).
    @Column('int', { nullable: true })
    port?: number;

    // true = connexion TLS implicite (port 465), false = STARTTLS/plain.
    @Column({ default: false })
    secure!: boolean;

    @Column({ nullable: true })
    username?: string;

    // Secret write-only (miroir de apiSecret côté SMS) : jamais exposé dans le
    // DTO de lecture EmailProvider.
    @Column({ nullable: true })
    password?: string;

    @Column({ nullable: true })
    fromAddress?: string;

    @Column({ nullable: true })
    fromName?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
