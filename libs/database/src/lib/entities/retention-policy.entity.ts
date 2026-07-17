import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('retention_policy')
export class RetentionPolicyEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ default: true })
    enabled!: boolean;

    // Âge (en jours) au-delà duquel un document devient éligible à la purge.
    @Column('int')
    retentionDays!: number;

    // SÉCURITÉ : true par défaut. Tant que dryRun vaut true, le job de purge
    // ne fait que LOGGER les documents qui SERAIENT purgés — aucune écriture
    // ni suppression en base. Aucune suppression physique n'est câblée à ce
    // stade, même quand dryRun vaut false (WARNING loggé à la place).
    @Column({ default: true })
    dryRun!: boolean;

    @Column('timestamp', { nullable: true })
    lastRunAt?: Date;

    @CreateDateColumn()
    createdAt!: Date;
}
