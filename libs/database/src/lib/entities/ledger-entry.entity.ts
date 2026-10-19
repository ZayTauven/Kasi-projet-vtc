import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { LedgerEntryNature } from './enums/ledger.enum';
import { LedgerLineEntity } from './ledger-line.entity';

/**
 * p2-argent I2 (2026-10-19) : ecriture du grand livre (fiche §3.1, §3.3).
 *
 * Une ecriture = une operation d'argent entiere (une fin de course, une
 * recharge, un versement...), au moins deux lignes dont la somme vaut zero.
 * Garde-fous DANS LA BASE (migration LedgerTables) : declencheur differe qui
 * refuse une ecriture desequilibree a la validation de la transaction ;
 * declencheur qui refuse tout UPDATE ou DELETE. On corrige par contre-passation.
 *
 * Seul point d'ecriture : postLedgerEntry (libs/database/src/lib/order/ledger.ts).
 */
@Entity('ledger_entry')
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Cle d'unicite de l'operation entiere (`order:<id>:finish`,
   * `payment:<gw>:<ref>`, `payout:<id>`, `opening:<compte>`...). Non nulle :
   * une operation manuelle sans cle recoit `operator-auto:<uuid>`.
   */
  @Index('IDX_ledger_entry_idempotencyKey', { unique: true })
  @Column('varchar', { length: 128 })
  idempotencyKey!: string;

  @Column('varchar', { length: 32 })
  nature!: LedgerEntryNature;

  @Column('char', { length: 3 })
  currency!: string;

  /** Course concernee (sans cle etrangere : l'ecriture ne bloque aucune suppression). */
  @Index('IDX_ledger_entry_requestId')
  @Column('integer', { nullable: true })
  requestId?: number | null;

  /** Operateur du back-office, pour une operation manuelle ou un versement. */
  @Column('integer', { nullable: true })
  operatorId?: number | null;

  /** Reference externe : passerelle, recu de caisse, versement. */
  @Column('varchar', { length: 255, nullable: true })
  reference?: string | null;

  /** Motif (toujours renseigne pour une operation manuelle). */
  @Column('varchar', { length: 500, nullable: true })
  motif?: string | null;

  /** Ecriture corrigee par cette contre-passation. */
  @ManyToOne(() => LedgerEntryEntity, { nullable: true })
  @JoinColumn({ name: 'reversesEntryId' })
  reversesEntry?: LedgerEntryEntity | null;

  @Column('integer', { nullable: true })
  reversesEntryId?: number | null;

  /** Especes encaissees par le Kasiman (fin de course), pour le releve. */
  @Column('bigint', { nullable: true, transformer: new ColumnNumericTransformer() })
  cashCollected?: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => LedgerLineEntity, (line) => line.entry)
  lines?: LedgerLineEntity[];
}
