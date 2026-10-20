import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { Point } from '../interfaces/point';
import { MultipointTransformer } from '../transformers/multipoint.transformer';

/** Source de l'itineraire d'un devis (tracabilite, fiche argent §5.2 et §5.4). */
export enum FareQuoteRoutingSource {
  Mapbox = 'mapbox',
  Google = 'google',
  Osrm = 'osrm',
  /** Estimation a vol d'oiseau : jamais un devis, sauf forfait de zone. */
  Haversine = 'haversine',
  /** Aucun itineraire calcule (prix independant de la distance). */
  None = 'none',
  /** Forfait de zone accorde sans itineraire reel (estimation seulement). */
  Zone = 'zone',
}

export enum FareQuoteKind {
  Initial = 'initial',
  /** I5 : arret ajoute (devis d'avenant, `parentQuoteId`). */
  Avenant = 'avenant',
}

/** D'ou vient le devis : apercu (`getFare`) ou calcule a la commande. */
export enum FareQuoteOrigin {
  Apercu = 'apercu',
  /** Commande sans devis retrouve (mesure « devis recalcule »). */
  Commande = 'commande',
}

/**
 * p2-argent I4 (2026-10-20) : devis fige (docs/fiche-conception-argent.md §5).
 *
 * Un devis = un prix calcule UNE fois par FareQuoteService, conserve, puis
 * consomme par une seule commande (`consumedAt`, `requestId` unique), par un
 * UPDATE conditionnel. Purge quotidienne des devis non consommes de plus de
 * 24 heures (admin-api).
 *
 * Montants entiers (FCFA). `optionIds` : identifiants d'options du service,
 * tries (appariement des apps installees). `pointsHash` : points saisis par
 * l'app (sans le retour d'un aller-retour), arrondis a 6 decimales.
 */
@Entity('fare_quote')
@Index('IDX_fare_quote_match', ['riderId', 'serviceId', 'pointsHash'])
@Index('IDX_fare_quote_createdAt', ['createdAt'])
@Index('IDX_fare_quote_requestId', ['requestId'], { unique: true })
export class FareQuoteEntity {
  /**
   * Genere par le code (crypto.randomUUID) : aucune extension PostgreSQL
   * requise (uuid-ossp n'est pas installee sur les bases Kasi).
   */
  @PrimaryColumn('uuid')
  id!: string;

  /** Null : visiteur (getFare sans connexion) ou apercu du back-office. */
  @Column('integer', { nullable: true })
  riderId?: number | null;

  @Column('integer')
  serviceId!: number;

  @Column('char', { length: 3 })
  currency!: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'MultiPoint',
    srid: 4326,
    transformer: new MultipointTransformer(),
  })
  points!: Point[];

  @Column('varchar', { length: 64 })
  pointsHash!: string;

  @Column('simple-array')
  optionIds!: string[];

  @Column('integer', { nullable: true })
  couponId?: number | null;

  @Column('boolean', { default: false })
  twoWay!: boolean;

  @Column('timestamp')
  pickupAt!: Date;

  /** Metres. */
  @Column('integer', { default: 0 })
  distance!: number;

  /** Secondes. */
  @Column('integer', { default: 0 })
  duration!: number;

  @Column('varchar', { length: 16 })
  routingSource!: FareQuoteRoutingSource;

  @Column('jsonb')
  breakdown!: Record<string, unknown>;

  @Column('integer')
  totalBeforeCoupon!: number;

  @Column('integer')
  total!: number;

  @Column('varchar', { length: 16, default: FareQuoteOrigin.Apercu })
  origin!: FareQuoteOrigin;

  @CreateDateColumn()
  createdAt!: Date;

  @Column('timestamp')
  expiresAt!: Date;

  @Column('timestamp', { nullable: true })
  consumedAt?: Date | null;

  @Column('integer', { nullable: true })
  requestId?: number | null;

  @Column('varchar', { length: 16, default: FareQuoteKind.Initial })
  kind!: FareQuoteKind;

  @Column('uuid', { nullable: true })
  parentQuoteId?: string | null;
}
