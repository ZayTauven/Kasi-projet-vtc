import { EntityManager, Repository } from 'typeorm';

import { OrderStatus } from '../entities/enums/order-status.enum';
import { RequestEntity } from '../entities/request.entity';

/**
 * p1-transitions (2026-09-29) : changement de statut d'une course par
 * ECRITURE CONDITIONNELLE.
 *
 *   UPDATE request SET status = <cible>, ... WHERE id = $1 AND status IN (<attendus>)
 *     [AND "driverId" = $2] [AND "riderId" = $3]
 *
 * PostgreSQL verrouille la ligne pendant l'UPDATE : de deux appels simultanes,
 * un seul trouve encore la course dans un statut attendu et la modifie ; l'autre
 * touche 0 ligne. L'appelant ne journalise l'activite et n'envoie les
 * notifications que si la ligne a ete modifiee (`changed`).
 *
 * Avant : lecture du statut puis ecriture sans condition (double assignation,
 * doublons d'activite et de notification sur rejeu, retour en arriere d'une
 * course deja demarree).
 */
export interface OrderTransition {
  /** Statuts depuis lesquels la transition est permise. */
  from: OrderStatus[];
  to: OrderStatus;
  /** Condition supplementaire : course de ce Kasiman (null : aucun Kasiman). */
  driverId?: number | null;
  /** Condition supplementaire : course de ce client. */
  riderId?: number;
  /** Colonnes ecrites en plus du statut. */
  set?: Partial<
    Pick<
      RequestEntity,
      | 'driverId'
      | 'etaPickup'
      | 'finishTimestamp'
      | 'costAfterCoupon'
      | 'paidAmount'
      | 'tipAmount'
      | 'waitMinutes'
    >
  >;
}

export async function transitionOrder(
  repoOrManager: Repository<RequestEntity> | EntityManager,
  orderId: number,
  transition: OrderTransition,
): Promise<boolean> {
  const qb = repoOrManager
    .createQueryBuilder()
    .update(RequestEntity)
    .set({ ...(transition.set ?? {}), status: transition.to })
    .where('id = :orderId', { orderId })
    .andWhere('status IN (:...fromStatuses)', {
      fromStatuses: transition.from,
    });
  if (transition.driverId === null) {
    qb.andWhere('"driverId" IS NULL');
  } else if (transition.driverId !== undefined) {
    qb.andWhere('"driverId" = :driverId', { driverId: transition.driverId });
  }
  if (transition.riderId !== undefined) {
    qb.andWhere('"riderId" = :riderId', { riderId: transition.riderId });
  }
  const result = await qb.execute();
  return (result.affected ?? 0) > 0;
}

/**
 * Progression normale d'une course cote Kasiman. Sert a reconnaitre un rejeu
 * tardif (ex. « arrive » recu apres « demarre ») : la course est deja au-dela de
 * l'etape demandee, on renvoie son etat sans rien reecrire.
 */
export const DRIVER_PROGRESSION: OrderStatus[] = [
  OrderStatus.DriverAccepted,
  OrderStatus.Arrived,
  OrderStatus.Started,
  OrderStatus.WaitingForPostPay,
  OrderStatus.WaitingForReview,
  OrderStatus.Finished,
];

/** true si `current` est l'etape `requested` ou une etape posterieure. */
export function isAtOrBeyond(
  current: OrderStatus,
  requested: OrderStatus,
): boolean {
  const c = DRIVER_PROGRESSION.indexOf(current);
  const r = DRIVER_PROGRESSION.indexOf(requested);
  return c >= 0 && r >= 0 && c >= r;
}

/** Statuts d'une course pas encore attribuee (offre ouverte). */
export const UNASSIGNED_STATUSES: OrderStatus[] = [
  OrderStatus.Requested,
  OrderStatus.NotFound,
  OrderStatus.NoCloseFound,
  OrderStatus.Found,
  OrderStatus.Booked,
];

/** Statuts d'ou un Kasiman peut accepter une offre (inchange depuis Ridy). */
export const ACCEPTABLE_STATUSES: OrderStatus[] = [
  OrderStatus.Found,
  OrderStatus.NoCloseFound,
  OrderStatus.Requested,
  OrderStatus.Booked,
];

/**
 * p2-argent I1 (2026-10-19) : statuts ou le prix de la course peut encore
 * changer (temps d'attente, coupon). Apres le demarrage, le prix est gele :
 * avant, l'attente et le coupon modifiaient le prix enregistre apres coup, sans
 * mouvement d'argent (anomalie A3 de docs/fiche-conception-argent.md).
 */
export const FARE_EDITABLE_STATUSES: OrderStatus[] = [
  ...UNASSIGNED_STATUSES,
  OrderStatus.DriverAccepted,
  OrderStatus.Arrived,
  OrderStatus.WaitingForPrePay,
];

/**
 * p2-argent I1 (2026-10-19) : statuts ou le pourboire peut encore changer,
 * jusqu'au paiement (rider-app l'envoie aussi depuis l'ecran de paiement,
 * WaitingForPostPay / WaitingForPrePay). Apres paiement, il ne bouge plus
 * (anomalie A2).
 */
export const TIP_EDITABLE_STATUSES: OrderStatus[] = [
  ...FARE_EDITABLE_STATUSES,
  OrderStatus.Started,
  OrderStatus.WaitingForPostPay,
];
