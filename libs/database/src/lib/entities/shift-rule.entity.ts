import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ShiftRuleFrequency } from "./enums/shift-rule-frequency.enum";

// Règle de temps de service Kasi (P6.3). Comme les autres entités du dossier
// (sms-provider, email-provider), l'entité reste du TypeORM pur : l'exposition
// GraphQL est portée par le DTO (dto/shift-rule.dto.ts).
@Entity('shift_rule')
export class ShiftRuleEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ default: true })
    enabled!: boolean;

    @Column('enum', { enum: ShiftRuleFrequency, default: ShiftRuleFrequency.Daily })
    frequency!: ShiftRuleFrequency;

    // Heures max de conduite autorisées sur la période (frequency).
    @Column('int')
    maxHoursPerPeriod!: number;

    // Pause obligatoire minimale (minutes) sur la période.
    @Column('int', { default: 0 })
    mandatoryBreakMinutes!: number;

    // false = règle indicative (avertissement) ; true = bloquante côté driver.
    @Column({ default: false })
    enforced!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
