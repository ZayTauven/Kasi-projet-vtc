import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Issue d'une sollicitation (p2-dispatch D4, fiche dispatch §3 et §6).
 *
 * - `pending` : offre ouverte, le Kasiman n'a pas encore repondu ;
 * - `accepted` : il a pris la course ;
 * - `rejected` : il l'a refusee (mutation facultative `rejectOrder`, Q13) ;
 * - `expired` : la course est passee en « aucun Kasiman » sans reponse de sa part ;
 * - `no_answer` : la course a ete prise par un autre Kasiman, ou annulee, sans
 *   reponse de sa part (les apps installees, sans bouton « Refuser », y tombent).
 */
export enum DispatchAttemptOutcome {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Expired = 'expired',
  NoAnswer = 'no_answer',
}

/**
 * p2-dispatch D4 (2026-10-20) : journal des sollicitations du dispatch par
 * vagues (`dira-r-journal`). Une ligne par (course, Kasiman), unique : c'est
 * aussi elle qui deduplique la push d'une offre (insertion conditionnelle).
 * Ecrit par driver-api en `DISPATCH_MODE=waves` seulement ; lu par admin-api
 * (`dispatchAttempts`). Pas de cle etrangere (comme `fare_quote`) : table de
 * journal, sans verrou sur `request`.
 */
@Entity('dispatch_attempt')
@Index('IDX_dispatch_attempt_request_driver', ['requestId', 'driverId'], { unique: true })
@Index('IDX_dispatch_attempt_driver_offeredAt', ['driverId', 'offeredAt'])
export class DispatchAttemptEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  requestId!: number;

  @Column('integer')
  driverId!: number;

  /** Numero de vague (1 = 1 km). */
  @Column('smallint')
  wave!: number;

  /** Rang dans la vague, apres classement par la route (1 = le mieux place). */
  @Column('smallint')
  rank!: number;

  /** Distance a vol d'oiseau au point de depart (GEO Redis), en metres. */
  @Column('integer')
  airDistanceM!: number;

  /** Distance routiere (matrice), en metres ; null sans classement par la route. */
  @Column('integer', { nullable: true })
  roadDistanceM?: number | null;

  /** Duree routiere estimee (matrice), en secondes. */
  @Column('integer', { nullable: true })
  roadDurationS?: number | null;

  /** `mapbox`, `osrm`, `haversine`, ou null si aucun classement n'a ete calcule. */
  @Column('varchar', { length: 16, nullable: true })
  routingSource?: string | null;

  @Column('varchar', { length: 16, default: DispatchAttemptOutcome.Pending })
  outcome!: DispatchAttemptOutcome;

  @CreateDateColumn()
  offeredAt!: Date;

  @Column('timestamp', { nullable: true })
  respondedAt?: Date | null;
}
