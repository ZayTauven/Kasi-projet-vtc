import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { DataSource, EntityManager } from 'typeorm';

import { DriverDocumentEntity, DriverDocumentStatus } from '../entities/driver-document.entity';
import { DriverDocumentTypeEntity } from '../entities/driver-document-type.entity';
import { MediaEntity } from '../entities/media.entity';
import { VehicleType } from '../entities/enums/vehicle-type.enum';

/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman et echeance
 * (docs/fiche-kyc.md). Partage par driver-api (envoi, controle `kyc-check`,
 * garde du statut) et admin-api (catalogue, revue).
 *
 * Toutes les ecritures sont conditionnelles ou faites sous le verrou de la
 * ligne `driver` : un rejeu ou deux operations concurrentes ne creent jamais
 * deux documents en attente ou valides pour le meme type (index uniques
 * partiels en dernier rempart).
 */

export interface DriverDocumentInput {
  typeId: number;
  mediaId?: number | null;
  number?: string | null;
  /** `YYYY-MM-DD`, valable jusqu'a ce jour inclus. */
  expiresAt?: string | null;
}

export interface ReviewResult {
  document: DriverDocumentEntity;
  /** Le Kasiman suspendu pour document expire est remis `offline`. */
  reinstated: boolean;
}

export interface SuspendedDriver {
  driverId: number;
  titles: string;
}

export interface DueReminder {
  documentId: number;
  driverId: number;
  title: string;
  expiresAt: string;
  daysLeft: number;
  threshold: number;
}

export interface ExpiringDocument {
  id: number;
  driverId: number;
  driverName: string | null;
  typeId: number;
  title: string;
  expiresAt: string;
  daysLeft: number;
}

/** Jour UTC (= heure de Dakar) au format `YYYY-MM-DD`. */
export function isoDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function kycError(message: string, code: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code } });
}

/** `UPDATE ... RETURNING` via `query()` renvoie `[lignes, nombre]` sous PostgreSQL. */
function rows<T>(raw: unknown): T[] {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0]) && typeof raw[1] === 'number') {
    return raw[0] as T[];
  }
  return (raw as T[]) ?? [];
}

/**
 * p2-kyc K4 (2026-10-20) : le type de document s'applique-t-il au vehicule du
 * Kasiman `dr` ? Liste vide = tous ; Kasiman sans type = tous (prudence : on
 * ne dispense personne faute de type). `t` = driver_document_type.
 */
export const DOCUMENT_APPLIES_SQL = `(cardinality(t."vehicleTypes") = 0 OR dr."vehicleType" IS NULL OR dr."vehicleType" = ANY(t."vehicleTypes"))`;

/**
 * Types obligatoires dont le Kasiman n'a qu'un document expire, sans document
 * valide du meme type : ce qui le suspend (Q3, Q5). `$1` = Kasiman. K4 : seuls
 * les types exiges pour son vehicule.
 */
const BLOCKING_SQL = `
  SELECT DISTINCT t."title"
    FROM "driver_document" d
    JOIN "driver_document_type" t ON t."id" = d."typeId"
    JOIN "driver" dr ON dr."id" = d."driverId"
   WHERE d."driverId" = $1 AND d."status" = 'expired' AND t."isEnabled" AND t."isRequired"
     AND ${DOCUMENT_APPLIES_SQL}
     AND NOT EXISTS (
       SELECT 1 FROM "driver_document" a
        WHERE a."driverId" = d."driverId" AND a."typeId" = d."typeId" AND a."status" = 'approved')`;

/** Titres des documents obligatoires expires qui bloquent le Kasiman (vide = rien). */
export async function blockingDocumentTitles(manager: EntityManager, driverId: number): Promise<string[]> {
  const found: Array<{ title: string }> = await manager.query(`${BLOCKING_SQL} ORDER BY t."title"`, [driverId]);
  return found.map((x) => x.title);
}

/**
 * p2-kyc K4 (2026-10-20, fiche KYC Q3) : documents obligatoires exiges pour le
 * vehicule du Kasiman et sans document valide. Bloque l'approbation d'un
 * nouveau Kasiman (admin-api) ; ne suspend jamais un Kasiman deja actif.
 */
export async function missingRequiredDocumentTitles(manager: EntityManager, driverId: number): Promise<string[]> {
  const found: Array<{ title: string }> = await manager.query(
    `SELECT t."title"
       FROM "driver_document_type" t
       JOIN "driver" dr ON dr."id" = $1
      WHERE t."isEnabled" AND t."isRequired" AND ${DOCUMENT_APPLIES_SQL}
        AND NOT EXISTS (
          SELECT 1 FROM "driver_document" a
           WHERE a."driverId" = dr."id" AND a."typeId" = t."id" AND a."status" = 'approved')
      ORDER BY t."sortOrder", t."id"`,
    [driverId],
  );
  return found.map((x) => x.title);
}

@Injectable()
export class DriverDocumentService {
  constructor(private readonly dataSource: DataSource) {}

  async listTypes(includeDisabled = false): Promise<DriverDocumentTypeEntity[]> {
    return this.dataSource.getRepository(DriverDocumentTypeEntity).find({
      where: includeDisabled ? {} : { isEnabled: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * p2-kyc K4 (2026-10-20) : catalogue actif exige pour le vehicule du
   * Kasiman (driver-app, « Mes documents »). Sans type : tout le catalogue.
   */
  async listTypesForDriver(driverId: number): Promise<DriverDocumentTypeEntity[]> {
    const [driver] = await this.dataSource.query(`SELECT "vehicleType" FROM "driver" WHERE "id" = $1`, [driverId]);
    const vehicleType: VehicleType | null = driver?.vehicleType ?? null;
    return (await this.listTypes()).filter(
      (t) => vehicleType == null || (t.vehicleTypes ?? []).length === 0 || t.vehicleTypes.includes(vehicleType),
    );
  }

  async missingTitles(driverId: number): Promise<string[]> {
    return missingRequiredDocumentTitles(this.dataSource.manager, driverId);
  }

  /** Documents du Kasiman hors remplaces, par type puis du plus recent au plus ancien. */
  async listForDriver(driverId: number): Promise<DriverDocumentEntity[]> {
    return this.dataSource
      .getRepository(DriverDocumentEntity)
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.type', 'type')
      .leftJoinAndSelect('d.media', 'media')
      .where('d.driverId = :driverId', { driverId })
      .andWhere('d.status <> :replaced', { replaced: DriverDocumentStatus.Replaced })
      .orderBy('type.sortOrder', 'ASC')
      .addOrderBy('d.createdAt', 'DESC')
      .addOrderBy('d.id', 'DESC')
      .getMany();
  }

  async blockingTitles(driverId: number): Promise<string[]> {
    return blockingDocumentTitles(this.dataSource.manager, driverId);
  }

  /**
   * Envoi par le Kasiman (`submitDriverDocument`) : document `pending`, qui
   * remplace l'attente precedente du meme type. Rejeu (meme fichier, meme
   * numero, meme echeance encore en attente) : le document existant.
   */
  async submit(driverId: number, input: DriverDocumentInput, now = new Date()): Promise<DriverDocumentEntity> {
    const id = await this.dataSource.transaction(async (manager) => {
      await this.lockDriver(manager, driverId);
      const clean = await this.validate(manager, driverId, input, now, true);
      const [same] = await manager.query(
        `SELECT "id" FROM "driver_document"
          WHERE "driverId" = $1 AND "typeId" = $2 AND "status" = 'pending'
            AND "mediaId" IS NOT DISTINCT FROM $3::int AND "number" IS NOT DISTINCT FROM $4::varchar
            AND "expiresAt" IS NOT DISTINCT FROM $5::date`,
        [driverId, clean.typeId, clean.mediaId, clean.number, clean.expiresAt],
      );
      if (same != null) return Number(same.id);
      await manager.query(
        `UPDATE "driver_document" SET "status" = 'replaced', "updatedAt" = now()
          WHERE "driverId" = $1 AND "typeId" = $2 AND "status" = 'pending'`,
        [driverId, clean.typeId],
      );
      return this.insert(manager, driverId, clean, DriverDocumentStatus.Pending, null);
    });
    return this.findOne(id);
  }

  /**
   * Document saisi par un operateur (`createDriverDocument`), valide d'emblee :
   * il type un fichier envoye par l'ancienne app (Q11). Remplace le valide
   * precedent du meme type ; peut reactiver le Kasiman suspendu (Q8).
   */
  async createApproved(
    operatorId: number,
    driverId: number,
    input: DriverDocumentInput,
    now = new Date(),
  ): Promise<ReviewResult> {
    const result = await this.dataSource.transaction(async (manager) => {
      await this.lockDriver(manager, driverId);
      const clean = await this.validate(manager, driverId, input, now, false);
      await this.replaceApproved(manager, driverId, clean.typeId);
      const id = await this.insert(manager, driverId, clean, DriverDocumentStatus.Approved, operatorId);
      return { id, reinstated: await this.reinstate(manager, driverId) };
    });
    return { document: await this.findOne(result.id), reinstated: result.reinstated };
  }

  /**
   * Revue d'un document en attente (`reviewDriverDocument`). Rejeu de la meme
   * decision : sans effet. Un document deja traite autrement : erreur.
   */
  async review(
    operatorId: number,
    documentId: number,
    approve: boolean,
    note?: string | null,
    now = new Date(),
  ): Promise<ReviewResult> {
    const result = await this.dataSource.transaction(async (manager) => {
      const [head] = await manager.query(`SELECT "driverId" FROM "driver_document" WHERE "id" = $1`, [documentId]);
      if (head == null) throw kycError('Document introuvable.', 'DOCUMENT_NOT_FOUND');
      const driverId = Number(head.driverId);
      await this.lockDriver(manager, driverId);
      const [doc] = await manager.query(
        `SELECT d."id", d."typeId", d."status", d."expiresAt"::text AS "expiresAt", t."hasExpiryDate"
           FROM "driver_document" d JOIN "driver_document_type" t ON t."id" = d."typeId"
          WHERE d."id" = $1 FOR UPDATE OF d`,
        [documentId],
      );
      const target = approve ? DriverDocumentStatus.Approved : DriverDocumentStatus.Rejected;
      if (doc.status === target) return { reinstated: false };
      if (doc.status !== DriverDocumentStatus.Pending) {
        throw kycError(`Ce document n'est plus en attente (${doc.status}).`, 'DOCUMENT_NOT_PENDING');
      }
      const reviewNote = note?.trim() ? note.trim().slice(0, 500) : null;
      if (approve) {
        if (doc.hasExpiryDate && doc.expiresAt == null) {
          throw kycError("Date d'expiration manquante.", 'DOCUMENT_EXPIRY_REQUIRED');
        }
        if (doc.expiresAt != null && doc.expiresAt < isoDay(now)) {
          throw kycError('Ce document est déjà expiré.', 'DOCUMENT_ALREADY_EXPIRED');
        }
        await this.replaceApproved(manager, driverId, Number(doc.typeId));
      }
      await manager.query(
        `UPDATE "driver_document"
            SET "status" = $2, "reviewNote" = $3, "reviewedAt" = now(), "reviewedByOperatorId" = $4, "updatedAt" = now()
          WHERE "id" = $1 AND "status" = 'pending'`,
        [documentId, target, reviewNote, operatorId],
      );
      return { reinstated: approve ? await this.reinstate(manager, driverId) : false };
    });
    return { document: await this.findOne(documentId), reinstated: result.reinstated };
  }

  /** Documents valides qui expirent d'ici `withinDays` jours (panel). */
  async expiring(withinDays: number, now = new Date()): Promise<ExpiringDocument[]> {
    const found: ExpiringDocument[] = await this.dataSource.query(
      `SELECT d."id", d."driverId",
              NULLIF(trim(concat_ws(' ', dr."firstName", dr."lastName")), '') AS "driverName",
              d."typeId", t."title", d."expiresAt"::text AS "expiresAt",
              (d."expiresAt" - $1::date) AS "daysLeft"
         FROM "driver_document" d
         JOIN "driver_document_type" t ON t."id" = d."typeId"
         JOIN "driver" dr ON dr."id" = d."driverId" AND dr."deletedAt" IS NULL
        WHERE d."status" = 'approved' AND d."expiresAt" BETWEEN $1::date AND $1::date + $2::int
        ORDER BY d."expiresAt", d."id"`,
      [isoDay(now), withinDays],
    );
    return found.map((x) => ({ ...x, daysLeft: Number(x.daysLeft) }));
  }

  // -------------------------------------------------------------------------
  // Controle `kyc-check` (driver-api, file kasi-dispatch)
  // -------------------------------------------------------------------------

  /** Documents echus (avant `today`) passes `expired`. Rejouable. */
  async expireDue(today: string): Promise<number> {
    const changed = rows<{ id: number }>(
      await this.dataSource.query(
        `UPDATE "driver_document" SET "status" = 'expired', "updatedAt" = now()
          WHERE "status" IN ('approved', 'pending') AND "expiresAt" < $1::date
          RETURNING "id"`,
        [today],
      ),
    );
    return changed.length;
  }

  /**
   * Kasimen `online`/`offline` bloques par un document obligatoire expire :
   * `soft reject`, note, `documentsSuspendedAt`. Ecriture conditionnelle : un
   * rejeu ne renvoie personne. Un Kasiman en course est pris au passage suivant.
   */
  async suspendBlocked(): Promise<SuspendedDriver[]> {
    const changed = rows<{ id: number; titles: string }>(
      await this.dataSource.query(
        `WITH blocking AS (
           SELECT d."driverId", string_agg(DISTINCT t."title", ', ' ORDER BY t."title") AS "titles"
             FROM "driver_document" d
             JOIN "driver_document_type" t ON t."id" = d."typeId"
             JOIN "driver" dr ON dr."id" = d."driverId"
            WHERE d."status" = 'expired' AND t."isEnabled" AND t."isRequired"
              AND ${DOCUMENT_APPLIES_SQL}
              AND NOT EXISTS (
                SELECT 1 FROM "driver_document" a
                 WHERE a."driverId" = d."driverId" AND a."typeId" = d."typeId" AND a."status" = 'approved')
            GROUP BY d."driverId")
         UPDATE "driver" dr
            SET "status" = 'soft reject', "documentsSuspendedAt" = now(),
                "documentsNote" = 'Document expiré : ' || b."titles" || '. Envoyez un document à jour depuis l''application.'
           FROM blocking b
          WHERE dr."id" = b."driverId" AND dr."status" IN ('online', 'offline') AND dr."deletedAt" IS NULL
          RETURNING dr."id", b."titles"`,
      ),
    );
    return changed.map((x) => ({ driverId: Number(x.id), titles: x.titles }));
  }

  /**
   * Rappels dus : documents valides dont l'echeance franchit un seuil du type
   * (J-30, 14...) pas encore rappele. Le seuil est ecrit sous condition avant
   * la push : un rejeu ne rappelle pas deux fois ; un passage manque est
   * rattrape au seuil courant (Q6).
   */
  async claimReminders(today: string): Promise<DueReminder[]> {
    const claimed = rows<DueReminder>(
      await this.dataSource.query(
        `WITH due AS (
           SELECT d."id", (d."expiresAt" - $1::date) AS "daysLeft",
                  (SELECT min(x) FROM unnest(t."reminderDays") x WHERE x >= (d."expiresAt" - $1::date)) AS "threshold",
                  t."title"
             FROM "driver_document" d
             JOIN "driver_document_type" t ON t."id" = d."typeId"
             JOIN "driver" dr ON dr."id" = d."driverId"
            WHERE d."status" = 'approved' AND d."expiresAt" >= $1::date AND t."isEnabled"
              AND dr."deletedAt" IS NULL AND dr."status" NOT IN ('hard reject', 'blocked'))
         UPDATE "driver_document" dd SET "lastReminderDays" = due."threshold"
           FROM due
          WHERE dd."id" = due."id" AND due."threshold" IS NOT NULL AND dd."status" = 'approved'
            AND (dd."lastReminderDays" IS NULL OR dd."lastReminderDays" > due."threshold")
          RETURNING dd."id" AS "documentId", dd."driverId", due."title", dd."expiresAt"::text AS "expiresAt",
                    due."daysLeft", due."threshold"`,
        [today],
      ),
    );
    return claimed.map((x) => ({
      ...x,
      documentId: Number(x.documentId),
      driverId: Number(x.driverId),
      daysLeft: Number(x.daysLeft),
      threshold: Number(x.threshold),
    }));
  }

  // -------------------------------------------------------------------------

  private async findOne(id: number): Promise<DriverDocumentEntity> {
    return this.dataSource.getRepository(DriverDocumentEntity).findOneOrFail({
      where: { id },
      relations: { type: true, media: true },
    });
  }

  private async lockDriver(manager: EntityManager, driverId: number): Promise<void> {
    const [driver] = await manager.query(
      `SELECT "id" FROM "driver" WHERE "id" = $1 AND "deletedAt" IS NULL FOR UPDATE`,
      [driverId],
    );
    if (driver == null) throw kycError('Kasiman introuvable.', 'DRIVER_NOT_FOUND');
  }

  private async validate(
    manager: EntityManager,
    driverId: number,
    input: DriverDocumentInput,
    now: Date,
    byDriver: boolean,
  ): Promise<{ typeId: number; mediaId: number | null; number: string | null; expiresAt: string | null }> {
    const type = await manager.getRepository(DriverDocumentTypeEntity).findOne({
      where: { id: Number(input.typeId) },
    });
    if (type == null || !type.isEnabled) {
      throw kycError('Type de document inconnu.', 'DOCUMENT_TYPE_UNKNOWN');
    }
    const expiresAt = input.expiresAt?.trim() || null;
    if (expiresAt != null) {
      const valid =
        /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) &&
        !Number.isNaN(Date.parse(`${expiresAt}T00:00:00Z`)) &&
        new Date(`${expiresAt}T00:00:00Z`).toISOString().slice(0, 10) === expiresAt;
      if (!valid) throw kycError("Date d'expiration invalide (AAAA-MM-JJ).", 'DOCUMENT_EXPIRY_INVALID');
      if (expiresAt < isoDay(now)) {
        throw kycError('Ce document est déjà expiré.', 'DOCUMENT_ALREADY_EXPIRED');
      }
    } else if (type.hasExpiryDate) {
      throw kycError("Date d'expiration manquante.", 'DOCUMENT_EXPIRY_REQUIRED');
    }
    const mediaId = input.mediaId == null ? null : Number(input.mediaId);
    if (mediaId == null && byDriver) {
      throw kycError('Fichier manquant.', 'DOCUMENT_MEDIA_REQUIRED');
    }
    if (mediaId != null) {
      const media = await manager.getRepository(MediaEntity).findOne({ where: { id: mediaId } });
      // Le Kasiman ne rattache que ses propres envois (`upload_document`) ;
      // l'operateur, aussi un fichier qu'il a lui-meme televerse (sans proprietaire).
      const owner = media?.driverDocumentId ?? null;
      if (media == null || (owner !== driverId && (byDriver || owner != null))) {
        throw kycError('Fichier introuvable.', 'DOCUMENT_MEDIA_UNKNOWN');
      }
    }
    const number = input.number?.trim() ? input.number.trim().slice(0, 64) : null;
    return { typeId: type.id, mediaId, number, expiresAt };
  }

  private async insert(
    manager: EntityManager,
    driverId: number,
    clean: { typeId: number; mediaId: number | null; number: string | null; expiresAt: string | null },
    status: DriverDocumentStatus,
    operatorId: number | null,
  ): Promise<number> {
    const [created] = await manager.query(
      `INSERT INTO "driver_document"
         ("driverId", "typeId", "mediaId", "number", "expiresAt", "status", "reviewedAt", "reviewedByOperatorId")
       VALUES ($1, $2, $3, $4, $5::date, $6, CASE WHEN $7::int IS NULL THEN NULL ELSE now() END, $7::int)
       RETURNING "id"`,
      [driverId, clean.typeId, clean.mediaId, clean.number, clean.expiresAt, status, operatorId],
    );
    return Number(created.id);
  }

  private async replaceApproved(manager: EntityManager, driverId: number, typeId: number): Promise<void> {
    await manager.query(
      `UPDATE "driver_document" SET "status" = 'replaced', "updatedAt" = now()
        WHERE "driverId" = $1 AND "typeId" = $2 AND "status" = 'approved'`,
      [driverId, typeId],
    );
  }

  /** Q8 : suspendu pour document expire et plus rien de bloquant : `offline`. */
  private async reinstate(manager: EntityManager, driverId: number): Promise<boolean> {
    if ((await blockingDocumentTitles(manager, driverId)).length > 0) return false;
    const changed = rows<{ id: number }>(
      await manager.query(
        `UPDATE "driver" SET "status" = 'offline', "documentsSuspendedAt" = NULL, "documentsNote" = NULL
          WHERE "id" = $1 AND "documentsSuspendedAt" IS NOT NULL
            AND "status" IN ('soft reject', 'pending approval', 'waiting documents')
          RETURNING "id"`,
        [driverId],
      ),
    );
    return changed.length > 0;
  }
}
