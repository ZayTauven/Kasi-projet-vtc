import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { LedgerAccountKind } from './enums/ledger.enum';

/**
 * p2-argent I2 (2026-10-19) : compte du grand livre (fiche §3.2, §3.3).
 *
 * Un compte par (code, devise) : `KASIMAN:12` en XOF. La fiche donne `code`
 * unique ; l'unicite porte ici sur (code, devise) parce que les portefeuilles,
 * dont les comptes de tiers sont la contrepartie exacte, sont deja un par
 * proprietaire ET par devise. Cree au premier mouvement (postLedgerEntry).
 */
@Entity('ledger_account')
@Index('IDX_ledger_account_code_currency', ['code', 'currency'], { unique: true })
export class LedgerAccountEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Ex. `KASIMAN:12`, `CLIENT:4`, `KASI:PRODUITS`, `TRESORERIE:WAVE`. */
  @Column('varchar', { length: 64 })
  code!: string;

  @Column('varchar', { length: 16 })
  kind!: LedgerAccountKind;

  /** id du Kasiman, du client ou de la flotte ; NULL pour les comptes de Kasi. */
  @Column('integer', { nullable: true })
  ownerId?: number | null;

  @Column('char', { length: 3 })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
