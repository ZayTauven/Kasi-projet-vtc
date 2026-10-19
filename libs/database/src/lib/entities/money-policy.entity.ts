import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * p2-argent I3 (2026-10-19) : politique d'argent par devise (fiche §4.1).
 *
 * Une ligne par devise : plafond de dette du Kasiman et seuil d'alerte, en
 * unites entieres de la devise (FCFA). Reglable sans deploiement (panel, ou
 * UPDATE en base en attendant l'ecran). Pas de ligne pour une devise : aucun
 * plafond dans cette devise.
 *
 * Dette = partie negative du solde du portefeuille du Kasiman (une seule
 * projection, `driver_wallet`). Bloque au-dela du plafond (dette > debtLimit),
 * alerte a partir du seuil (dette >= debtAlertThreshold).
 */
@Entity('money_policy')
@Index('IDX_money_policy_currency', ['currency'], { unique: true })
export class MoneyPolicyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('char', { length: 3 })
  currency!: string;

  /** Plafond de dette : 10 000 FCFA au pilote (KASI_DECISIONS 2026-10-19). */
  @Column('integer')
  debtLimit!: number;

  /** Seuil d'alerte : 7 500 FCFA au pilote. */
  @Column('integer')
  debtAlertThreshold!: number;

  /** Operateur de la derniere modification (NULL : valeur de la migration). */
  @Column('integer', { nullable: true })
  updatedByOperatorId?: number | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
