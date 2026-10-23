import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { AnnouncementUserType } from '../entities/enums/anouncement-user-type.enum';
import { OrderCancelReasonEntity } from '../entities/order-cancel-reason.entity';

/**
 * p3-mesures M4, lot A1 (2026-10-22) : motifs d'annulation
 * (docs/fiche-motifs-annulation.md §2 « API »).
 *
 * Le catalogue `order_cancel_reason` est gere dans le panel ; chaque auteur
 * (client, Kasiman, operateur) choisit parmi SES motifs actifs.
 */

/** Plus grand identifiant d'une colonne `integer` PostgreSQL. */
const MAX_INTEGER_ID = 2147483647;

/** Motifs actifs d'un auteur, tries par identifiant (requete `cancelReasons`). */
export async function listCancelReasons(
  manager: EntityManager,
  userType: AnnouncementUserType,
): Promise<Array<{ id: number; title: string }>> {
  return manager.getRepository(OrderCancelReasonEntity).find({
    select: { id: true, title: true },
    where: { userType, isEnabled: true },
    order: { id: 'ASC' },
  });
}

/**
 * Motif a ecrire avec l'annulation, ou `undefined` (rien a ecrire).
 *
 * Une annulation n'echoue JAMAIS a cause du motif : un motif peut avoir ete
 * desactive dans le panel entre l'affichage et l'envoi. Motif absent (apps
 * deja installees) : `undefined`, sans journal. Motif illisible, inconnu,
 * desactive ou d'un autre auteur : `undefined` et un avertissement.
 */
export async function resolveCancelReasonId(
  manager: EntityManager,
  raw: unknown,
  author: AnnouncementUserType,
  orderId: number,
): Promise<number | undefined> {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const id =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw.trim())
        ? Number(raw.trim())
        : NaN;
  const refuse = (why: string): undefined => {
    Logger.warn(
      `motif d'annulation ${JSON.stringify(raw)} ignore (course ${orderId}, auteur ${author}) : ${why}`,
      'CancelReason',
    );
    return undefined;
  };
  if (!Number.isSafeInteger(id) || id <= 0 || id > MAX_INTEGER_ID) {
    return refuse('identifiant illisible');
  }
  const reason = await manager
    .getRepository(OrderCancelReasonEntity)
    .findOne({ where: { id } });
  if (reason == null) {
    return refuse('inconnu');
  }
  if (!reason.isEnabled) {
    return refuse('desactive');
  }
  if (reason.userType !== author) {
    return refuse(`motif ${reason.userType}`);
  }
  return id;
}
