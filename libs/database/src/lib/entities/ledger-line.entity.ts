import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { LedgerLineNature } from './enums/ledger.enum';
import { LedgerAccountEntity } from './ledger-account.entity';
import { LedgerEntryEntity } from './ledger-entry.entity';

/**
 * p2-argent I2 (2026-10-19) : ligne d'une ecriture du grand livre (fiche §3.3).
 *
 * Montant ENTIER signe (bigint, le FCFA n'a pas de subdivision) ; convention
 * de la fiche §3.2 : positif = le compte recoit. Pour un compte de tiers, le
 * solde est ce que Kasi lui doit (negatif : sa dette).
 */
@Entity('ledger_line')
export class LedgerLineEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_ledger_line_entryId')
  @Column('integer')
  entryId!: number;

  @ManyToOne(() => LedgerEntryEntity, (entry) => entry.lines)
  @JoinColumn({ name: 'entryId' })
  entry?: LedgerEntryEntity;

  @Index('IDX_ledger_line_accountId')
  @Column('integer')
  accountId!: number;

  @ManyToOne(() => LedgerAccountEntity)
  @JoinColumn({ name: 'accountId' })
  account?: LedgerAccountEntity;

  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  amount!: number;

  @Column('varchar', { length: 32 })
  nature!: LedgerLineNature;
}
