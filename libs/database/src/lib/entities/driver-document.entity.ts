import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DriverDocumentTypeEntity } from './driver-document-type.entity';
import { DriverEntity } from './driver.entity';
import { MediaEntity } from './media.entity';

/**
 * Etat d'un document du Kasiman (p2-kyc K1, fiche KYC §3).
 * - `pending` : envoye, en attente de revue ;
 * - `approved` : valide par un operateur ;
 * - `rejected` : refuse (note de revue) ;
 * - `expired` : echeance passee (controle `kyc-check`) ;
 * - `replaced` : remplace par un envoi ou une validation plus recente.
 */
export enum DriverDocumentStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Expired = 'expired',
  Replaced = 'replaced',
}

/**
 * p2-kyc K1 (2026-10-20) : document type du Kasiman, avec echeance
 * (equivalent Kasi du `driver_to_driver_document` de BetterSuite). Un seul
 * document en attente et un seul valide par (Kasiman, type) : index uniques
 * partiels. Toutes les transitions sont des ecritures conditionnelles.
 */
@Entity('driver_document')
@Index('IDX_driver_document_driver_type', ['driverId', 'typeId'])
@Index('IDX_driver_document_status_expiresAt', ['status', 'expiresAt'])
@Index('IDX_driver_document_one_pending', ['driverId', 'typeId'], {
  unique: true,
  where: `"status" = 'pending'`,
})
@Index('IDX_driver_document_one_approved', ['driverId', 'typeId'], {
  unique: true,
  where: `"status" = 'approved'`,
})
export class DriverDocumentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DriverEntity, { onDelete: 'CASCADE' })
  driver?: DriverEntity;

  @Column('integer')
  driverId!: number;

  @ManyToOne(() => DriverDocumentTypeEntity, { onDelete: 'RESTRICT' })
  type?: DriverDocumentTypeEntity;

  @Column('integer')
  typeId!: number;

  /** Fichier envoye par `POST /upload_document` (ou par le panel). */
  @ManyToOne(() => MediaEntity, { onDelete: 'SET NULL' })
  media?: MediaEntity | null;

  @Column('integer', { nullable: true })
  mediaId?: number | null;

  @Column('varchar', { length: 64, nullable: true })
  number?: string | null;

  /** Valable jusqu'a ce jour inclus (Dakar = UTC). `YYYY-MM-DD`. */
  @Column('date', { nullable: true })
  expiresAt?: string | null;

  @Column('varchar', { length: 16, default: DriverDocumentStatus.Pending })
  status!: DriverDocumentStatus;

  @Column('varchar', { length: 500, nullable: true })
  reviewNote?: string | null;

  @Column('timestamp', { nullable: true })
  reviewedAt?: Date | null;

  @Column('integer', { nullable: true })
  reviewedByOperatorId?: number | null;

  /** Plus petit seuil de rappel deja envoye (J-30, 14...) : une push par seuil. */
  @Column('smallint', { nullable: true })
  lastReminderDays?: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
