import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { VEHICLE_TYPE_ENUM_NAME, VehicleType } from './enums/vehicle-type.enum';

/**
 * p2-kyc K1 (2026-10-20) : catalogue des documents du Kasiman
 * (docs/fiche-kyc.md §3). Equivalent Kasi du `driver_document` de
 * BetterSuite 5.3.2. Seme par la migration DriverDocuments (permis, carte
 * grise, assurance, piece d'identite, visite technique ; Q1).
 */
@Entity('driver_document_type')
@Index('IDX_driver_document_type_code', ['code'], { unique: true })
export class DriverDocumentTypeEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Code stable (`driving_license`...), lu par le code et les apps. */
  @Column('varchar', { length: 32 })
  code!: string;

  @Column('varchar', { length: 120 })
  title!: string;

  @Column('text', { nullable: true })
  description?: string | null;

  @Column({ default: true })
  isEnabled!: boolean;

  /** Obligatoire : son expiration suspend le Kasiman (Q3). */
  @Column({ default: true })
  isRequired!: boolean;

  /** Une date d'expiration est exigee a l'envoi. */
  @Column({ default: true })
  hasExpiryDate!: boolean;

  /** Jours avant l'echeance ou un rappel part (Q6). */
  @Column('int', { array: true, default: () => "'{30,14,7,3,1}'" })
  reminderDays!: number[];

  @Column('smallint', { default: 0 })
  sortOrder!: number;

  /**
   * p2-kyc K4 / p2-vehicules (2026-10-20) : vehicules pour lesquels ce
   * document est exige. Vide = tous (catalogue seme : tous, Q1).
   */
  @Column('enum', {
    enum: VehicleType,
    enumName: VEHICLE_TYPE_ENUM_NAME,
    array: true,
    default: '{}',
  })
  vehicleTypes!: VehicleType[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
