import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Point } from '../interfaces/point';
import { PointTransformer } from '../transformers/point.transformer';

/**
 * p2-dispatch D6 (2026-10-20) : demande non servie (`dira-r-nonservi`). Une
 * ligne par course dispatchee par vagues et passee en « aucun Kasiman »,
 * avec son point de depart. Trois demandes a moins de 1 km en 15 min
 * declenchent une push aux Kasimen en ligne a moins de 5 km, une fois par
 * zone et par heure (Q12) : `alertedAt` marque la demande qui a declenche
 * l'alerte. Ecrit par driver-api, lu par admin-api (`unservedDemands`).
 */
@Entity('unserved_demand')
@Index('IDX_unserved_demand_requestId', ['requestId'], { unique: true })
@Index('IDX_unserved_demand_createdAt', ['createdAt'])
export class UnservedDemandEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  requestId!: number;

  @Column('integer')
  serviceId!: number;

  @Index('IDX_unserved_demand_point', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    transformer: new PointTransformer(),
  })
  point!: Point;

  /** Kasimen sollicites par les vagues (0 : personne a portee). */
  @Column('integer', { default: 0 })
  driversSolicited!: number;

  @CreateDateColumn()
  createdAt!: Date;

  /** Alerte « forte demande » partie sur cette demande (Q12). */
  @Column('timestamp', { nullable: true })
  alertedAt?: Date | null;

  /** Kasimen en ligne prevenus par l'alerte. */
  @Column('integer', { nullable: true })
  alertedDrivers?: number | null;
}
