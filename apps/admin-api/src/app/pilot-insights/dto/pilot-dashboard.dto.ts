import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

/**
 * p3-mesures M1 (2026-10-21) : tableau de suivi du pilote
 * (docs/fiche-mesures-pilote.md §3 et §4). Types neufs, lus par le seul
 * panel : ajout pur, aucune app installee ne les voit.
 *
 * Regle commune : une course appartient a la semaine (lundi-dimanche, UTC =
 * heure de Dakar) de sa commande (`requestTimestamp`), ses offres, son avis
 * et sa demande non servie avec elle. L'argent (indicateur 5) appartient a la
 * semaine de son ecriture au grand livre. Un taux sans denominateur vaut null.
 */

@ObjectType('PilotThresholds', {
  description: 'Seuils de reussite du pilote (fiche §6, valides le 2026-10-21).',
})
export class PilotThresholdsDTO {
  @Field(() => Int, { description: 'Delai d attribution median maximal, en secondes.' })
  assignmentMedianMaxSeconds!: number;

  @Field(() => Float, { description: 'Taux de service minimal (0 a 1).' })
  serviceRateMin!: number;

  @Field(() => Float, { description: 'Retention hebdomadaire minimale des Kasimen (0 a 1).' })
  kasimanRetentionMin!: number;

  @Field(() => Float, { description: 'Recouvrement minimal de la commission en especes (0 a 1).' })
  cashRecoveryMin!: number;

  @Field(() => Float, { description: 'Part minimale de clients recurrents (0 a 1).' })
  recurringClientsMin!: number;

  @Field(() => Int, { description: 'Point mort, en courses terminees par mois.' })
  breakEvenMonthlyOrders!: number;
}

@ObjectType('PilotOrders')
export class PilotOrdersDTO {
  @Field(() => Int)
  ordered!: number;

  @Field(() => Int, { description: 'WaitingForReview ou Finished.' })
  completed!: number;

  @Field(() => Int)
  riderCanceledBeforeAssignment!: number;

  @Field(() => Int)
  riderCanceledAfterAssignment!: number;

  @Field(() => Int)
  driverCanceled!: number;

  @Field(() => Int, {
    description: 'Expirees sans Kasiman (Expired, NotFound, NoCloseFound), hors annulation operateur.',
  })
  expired!: number;

  @Field(() => Int)
  operatorCanceled!: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Courses terminees ramenees a 30 jours (jours ecoules de la tranche).',
  })
  monthlyProjection?: number | null;
}

@ObjectType('PilotAssignment')
export class PilotAssignmentDTO {
  @Field(() => Int, { description: 'Courses immediates attribuees (reservations exclues).' })
  assigned!: number;

  @Field(() => Float, { nullable: true })
  medianSeconds?: number | null;

  @Field(() => Float, { nullable: true })
  p90Seconds?: number | null;
}

@ObjectType('PilotServiceRate')
export class PilotServiceRateDTO {
  @Field(() => Int)
  assigned!: number;

  @Field(() => Int, { description: 'Commandees moins annulations du client avant attribution.' })
  eligible!: number;

  @Field(() => Float, { nullable: true })
  rate?: number | null;
}

@ObjectType('PilotOffers', { description: 'Dispatch par vagues seulement (dispatch_attempt).' })
export class PilotOffersDTO {
  @Field(() => Int)
  accepted!: number;

  @Field(() => Int)
  rejected!: number;

  @Field(() => Int)
  noAnswer!: number;

  @Field(() => Int)
  expired!: number;

  @Field(() => Float, { nullable: true })
  rate?: number | null;

  @Field(() => Float, { nullable: true })
  averageWave?: number | null;
}

@ObjectType('PilotCancelReason')
export class PilotCancelReasonDTO {
  @Field(() => ID, { nullable: true, description: 'null : annulation sans motif.' })
  reasonId?: number | null;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => AnnouncementUserType, { nullable: true, description: 'Destinataire du motif.' })
  userType?: AnnouncementUserType | null;

  @Field(() => AnnouncementUserType, {
    nullable: true,
    description: 'Auteur de l annulation (Rider, Driver) ; null dans le top 5 du tableau.',
  })
  canceledBy?: AnnouncementUserType | null;

  @Field(() => Int)
  count!: number;
}

@ObjectType('PilotCancellations')
export class PilotCancellationsDTO {
  @Field(() => Float, { nullable: true })
  riderBeforeAssignmentRate?: number | null;

  @Field(() => Float, { nullable: true })
  riderAfterAssignmentRate?: number | null;

  @Field(() => Float, { nullable: true })
  driverRate?: number | null;

  @Field(() => [PilotCancelReasonDTO], { description: 'Les 5 motifs les plus frequents.' })
  topReasons!: PilotCancelReasonDTO[];
}

@ObjectType('PilotMoney', {
  description: 'Commission en especes (grand livre). Exige ProviderWallet_View.',
})
export class PilotMoneyDTO {
  @Field(() => Float)
  commissionDue!: number;

  @Field(() => Float)
  commissionRecovered!: number;

  @Field(() => Float, { nullable: true })
  recoveryRate?: number | null;

  @Field(() => Float, { description: 'Dette des Kasimen en fin de tranche (positive).' })
  outstandingDebt!: number;

  @Field(() => Int, {
    description: 'Kasimen au-dela du plafond (money_policy du moment) en fin de tranche.',
  })
  blockedKasimen!: number;
}

@ObjectType('PilotKasimen')
export class PilotKasimenDTO {
  @Field(() => Int)
  active!: number;

  @Field(() => Int)
  new!: number;

  @Field(() => Int)
  retained!: number;

  @Field(() => Int, {
    description: 'Actifs la semaine precedente (somme sur les semaines pour la periode).',
  })
  retentionBase!: number;

  @Field(() => Float, { nullable: true })
  retentionRate?: number | null;
}

@ObjectType('PilotClients')
export class PilotClientsDTO {
  @Field(() => Int)
  active!: number;

  @Field(() => Int, { description: 'Au moins 2 courses terminees dans la tranche.' })
  recurring!: number;

  @Field(() => Int)
  new!: number;

  @Field(() => Float, { nullable: true })
  recurringRate?: number | null;
}

@ObjectType('PilotZone')
export class PilotZoneDTO {
  @Field(() => Float, { description: 'Maille de 0,01 degre (environ 1,1 km).' })
  lat!: number;

  @Field(() => Float)
  lng!: number;

  @Field(() => Int)
  demands!: number;

  @Field(() => Int)
  alerts!: number;
}

@ObjectType('PilotUnserved')
export class PilotUnservedDTO {
  @Field(() => Int)
  expired!: number;

  @Field(() => Int)
  demands!: number;

  @Field(() => Int)
  alerts!: number;

  @Field(() => [PilotZoneDTO], { description: '10 zones au plus, les plus demandees.' })
  zones!: PilotZoneDTO[];
}

@ObjectType('PilotSatisfaction')
export class PilotSatisfactionDTO {
  @Field(() => Int)
  reviews!: number;

  @Field(() => Float, { nullable: true, description: 'Note moyenne en etoiles (score / 20).' })
  averageStars?: number | null;

  @Field(() => Float, { nullable: true, description: 'Part des notes de 3 etoiles ou moins.' })
  lowRatingShare?: number | null;
}

@ObjectType('PilotIndicators')
export class PilotIndicatorsDTO {
  @Field(() => PilotOrdersDTO)
  orders!: PilotOrdersDTO;

  @Field(() => PilotAssignmentDTO)
  assignment!: PilotAssignmentDTO;

  @Field(() => PilotServiceRateDTO)
  service!: PilotServiceRateDTO;

  @Field(() => PilotOffersDTO)
  offers!: PilotOffersDTO;

  @Field(() => PilotCancellationsDTO)
  cancellations!: PilotCancellationsDTO;

  @Field(() => PilotMoneyDTO, {
    nullable: true,
    description: 'Tous services seulement, et avec ProviderWallet_View ; sinon null.',
  })
  money?: PilotMoneyDTO | null;

  @Field(() => PilotKasimenDTO)
  kasimen!: PilotKasimenDTO;

  @Field(() => PilotClientsDTO)
  clients!: PilotClientsDTO;

  @Field(() => PilotUnservedDTO)
  unserved!: PilotUnservedDTO;

  @Field(() => PilotSatisfactionDTO)
  satisfaction!: PilotSatisfactionDTO;
}

@ObjectType('PilotWeek')
export class PilotWeekDTO {
  @Field(() => Date, { nullable: true, description: 'Lundi 00:00 UTC ; null pour la periode entiere.' })
  weekStart?: Date | null;

  @Field(() => Date, { description: 'Debut de la tranche (borne par from).' })
  start!: Date;

  @Field(() => Date, { description: 'Fin exclue de la tranche (bornee par to).' })
  end!: Date;

  @Field(() => PilotIndicatorsDTO, { description: 'Tous services.' })
  all!: PilotIndicatorsDTO;

  @Field(() => PilotIndicatorsDTO, { description: 'Personnes (orderType Ride).' })
  people!: PilotIndicatorsDTO;

  @Field(() => PilotIndicatorsDTO, { description: 'Colis (orderType Delivery).' })
  parcels!: PilotIndicatorsDTO;
}

@ObjectType('PilotDashboard')
export class PilotDashboardDTO {
  @Field(() => Date)
  from!: Date;

  @Field(() => Date)
  to!: Date;

  @Field(() => Date)
  generatedAt!: Date;

  @Field(() => String)
  currency!: string;

  @Field(() => Boolean, { description: 'false sans ProviderWallet_View : money vaut null.' })
  moneyVisible!: boolean;

  @Field(() => PilotThresholdsDTO)
  thresholds!: PilotThresholdsDTO;

  @Field(() => [PilotWeekDTO])
  weeks!: PilotWeekDTO[];

  @Field(() => PilotWeekDTO)
  total!: PilotWeekDTO;
}

@ObjectType('PilotKasiman', {
  description: 'Classement des Kasimen (repris de BetterSuite drivers-insights, adapte).',
})
export class PilotKasimanDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => Int)
  completed!: number;

  @Field(() => Float, { description: 'Prix avant coupon moins commission, plus pourboire.' })
  earnings!: number;

  @Field(() => String, { nullable: true })
  currency?: string | null;
}

@ObjectType('PilotExport')
export class PilotExportDTO {
  @Field(() => String)
  url!: string;

  @Field(() => Int)
  rows!: number;
}
