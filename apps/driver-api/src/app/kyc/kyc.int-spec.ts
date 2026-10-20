/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman, controle `kyc-check`
 * (expiration, suspension, rappels), garde du statut, revue par le panel.
 * Contre PostgreSQL et Redis reels ; fiche : docs/fiche-kyc.md.
 *
 *   npm run test:integration -- kyc
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  concurrently,
  createOperator,
  createWorld,
  Doubles,
  DriverStatus,
  errorOf,
  makeDoubles,
  openDataSource,
  openRedis,
  PLATEAU,
  resetDatabase,
  World,
} from '../../../../../tools/test-integration/harness';
import { DriverEntity } from '../../../../../libs/database/src/lib/entities/driver.entity';
import { ServiceEntity } from '../../../../../libs/database/src/lib/entities/service.entity';
import { DriverDocumentService } from '../../../../../libs/database/src/lib/order/driver-document.service';
import { DriverRedisService } from '../../../../../libs/database/src/lib/redis/driver-redis.service';
import { AdminDriverDocumentResolver } from '../../../../admin-api/src/app/kyc/driver-document.resolver';
import { DriverQueryService } from '../driver/driver-query.service';
import { DriverDocumentResolver } from './driver-document.resolver';
import { KycCheckService } from './kyc-check.service';

const DAY = 24 * 3600 * 1000;
/** Jour UTC decale de `offset` jours, `YYYY-MM-DD`. */
const day = (offset: number, from = Date.now()) => new Date(from + offset * DAY).toISOString().slice(0, 10);
/** Aujourd'hui a `hour` h UTC (Dakar). */
const todayAt = (hour: number) => new Date(`${day(0)}T${String(hour).padStart(2, '0')}:00:00Z`);

describe('p2-kyc K1 : documents types et expiration', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let docs: DriverDocumentService;
  let check: KycCheckService;
  let driverRedis: DriverRedisService;
  const types: Record<string, number> = {};

  beforeAll(async () => {
    ds = await openDataSource();
    redis = openRedis();
  });
  afterAll(async () => {
    await resetDatabase(ds, redis);
    await ds.destroy();
    redis.disconnect();
  });
  beforeEach(async () => {
    await resetDatabase(ds, redis);
    d = makeDoubles();
    world = await createWorld(ds, { drivers: 2 });
    docs = new DriverDocumentService(ds);
    driverRedis = new DriverRedisService(redis);
    check = new KycCheckService(docs, driverRedis, ds, d.driverNotifications as never);
    // Catalogue du banc (TRUNCATE vide celui de la migration).
    for (const [code, required, expiry] of [
      ['driving_license', true, true],
      ['vehicle_registration', true, false],
      ['badge', false, true],
    ] as Array<[string, boolean, boolean]>) {
      const [{ id }] = await ds.query(
        `INSERT INTO driver_document_type (code, title, "isRequired", "hasExpiryDate")
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [code, code === 'driving_license' ? 'Permis de conduire' : code, required, expiry],
      );
      types[code] = Number(id);
    }
  });

  const k = (i: number) => world.driverIds[i];
  const media = async (owner: number | null) =>
    Number(
      (await ds.query(`INSERT INTO media (address, "driverDocumentId") VALUES ('doc.jpg', $1) RETURNING id`, [owner]))[0]
        .id,
    );
  const driverRow = async (id: number) =>
    (
      await ds.query(`SELECT status, "documentsNote", "documentsSuspendedAt" FROM driver WHERE id = $1`, [id])
    )[0] as { status: string; documentsNote: string | null; documentsSuspendedAt: Date | null };
  const statuses = async (driverId: number) =>
    (
      await ds.query(`SELECT status FROM driver_document WHERE "driverId" = $1 ORDER BY id`, [driverId])
    ).map((x: { status: string }) => x.status);
  /** Document deja valide, echeance libre (insere tel quel). */
  const approved = async (driverId: number, typeId: number, expiresAt: string | null) =>
    Number(
      (
        await ds.query(
          `INSERT INTO driver_document ("driverId", "typeId", "expiresAt", status) VALUES ($1, $2, $3, 'approved') RETURNING id`,
          [driverId, typeId, expiresAt],
        )
      )[0].id,
    );
  const ctx = (id: number) => ({ req: { user: { id } } }) as never;
  const queryService = (driverId: number) =>
    new DriverQueryService(
      ds.getRepository(DriverEntity),
      ds.getRepository(ServiceEntity),
      driverRedis,
      ctx(driverId),
    );
  const pushes = () => d.driverNotifications.args.filter((x) => x.method === 'plainText');

  describe('envoi par le Kasiman (driver-api)', () => {
    it('document en attente ; rejeu = le meme ; nouvel envoi = remplace ; controles d entree', async () => {
      const api = new DriverDocumentResolver(docs, ctx(k(0)));
      expect((await api.driverDocumentTypes()).map((t) => t.code)).toEqual([
        'driving_license',
        'vehicle_registration',
        'badge',
      ]);
      const m1 = await media(k(0));
      const input = { typeId: types.driving_license, mediaId: m1, number: ' B-123 ', expiresAt: day(90) };
      const first = await api.submitDriverDocument(input);
      expect(first).toMatchObject({ status: 'pending', number: 'B-123', expiresAt: day(90), mediaId: m1 });
      expect(first.type.code).toBe('driving_license');
      expect((await api.submitDriverDocument(input)).id).toBe(first.id); // rejeu

      const second = await api.submitDriverDocument({ ...input, mediaId: await media(k(0)) });
      expect(second.id).not.toBe(first.id);
      expect(await statuses(k(0))).toEqual(['replaced', 'pending']);
      expect((await api.driverDocuments()).map((x) => x.id)).toEqual([second.id]);

      expect(await errorOf(api.submitDriverDocument({ ...input, mediaId: await media(k(1)) }))).toBe(
        'Fichier introuvable.',
      );
      expect(await errorOf(api.submitDriverDocument({ ...input, expiresAt: day(-1) }))).toBe(
        'Ce document est déjà expiré.',
      );
      expect(await errorOf(api.submitDriverDocument({ ...input, expiresAt: '2026-02-30' }))).toBe(
        "Date d'expiration invalide (AAAA-MM-JJ).",
      );
      expect(await errorOf(api.submitDriverDocument({ ...input, expiresAt: null }))).toBe(
        "Date d'expiration manquante.",
      );
      // Carte grise : sans date d'expiration.
      const card = await api.submitDriverDocument({ typeId: types.vehicle_registration, mediaId: m1 });
      expect(card).toMatchObject({ status: 'pending', expiresAt: null });
    });

    it('deux envois concurrents du meme type : un seul en attente', async () => {
      const files = [await media(k(0)), await media(k(0)), await media(k(0))];
      const results = await concurrently(3, (i) =>
        docs.submit(k(0), { typeId: types.driving_license, mediaId: files[i], expiresAt: day(60) }),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect((await statuses(k(0))).sort()).toEqual(['pending', 'replaced', 'replaced']);
    });
  });

  describe('revue par le panel (admin-api)', () => {
    it('permissions ; validation, rejeu, refus ; un seul valide par type ; liste des echeances', async () => {
      const viewer = await createOperator(ds, ['Drivers_View']);
      const editor = await createOperator(ds, ['Drivers_View', 'Drivers_Edit']);
      const asViewer = new AdminDriverDocumentResolver(docs, ds, ctx(viewer));
      const admin = new AdminDriverDocumentResolver(docs, ds, ctx(editor));
      await approved(k(0), types.driving_license, day(5));
      const pending = await docs.submit(k(0), {
        typeId: types.driving_license,
        mediaId: await media(k(0)),
        expiresAt: day(400),
      });

      expect(await errorOf(asViewer.reviewDriverDocument(pending.id, true))).toBe('PERMISSION_NOT_GRANTED');
      const ok = await admin.reviewDriverDocument(pending.id, true, 'RAS');
      expect(ok.document).toMatchObject({ status: 'approved', reviewNote: 'RAS', reviewedByOperatorId: editor });
      expect(ok.reinstated).toBe(false);
      expect((await admin.reviewDriverDocument(pending.id, true)).document.status).toBe('approved'); // rejeu
      expect(await errorOf(admin.reviewDriverDocument(pending.id, false))).toBe(
        "Ce document n'est plus en attente (approved).",
      );
      expect(await statuses(k(0))).toEqual(['replaced', 'approved']);

      const refused = await docs.submit(k(1), { typeId: types.badge, mediaId: await media(k(1)), expiresAt: day(3) });
      expect((await admin.reviewDriverDocument(refused.id, false, 'Illisible')).document).toMatchObject({
        status: 'rejected',
        reviewNote: 'Illisible',
      });

      await approved(k(1), types.badge, day(10));
      const soon = await asViewer.expiringDriverDocuments(30);
      expect(soon.map((x) => [x.driverId, x.daysLeft])).toEqual([[k(1), 10]]);
      expect((await asViewer.driverDocumentTypes()).length).toBe(3);
      expect(await errorOf(asViewer.createDriverDocumentType({ code: 'x1', title: 'X' }))).toBe(
        'PERMISSION_NOT_GRANTED',
      );
      const created = await admin.createDriverDocumentType({ code: 'Medical', title: ' Visite médicale ', reminderDays: [7, 30, 7] });
      expect(created).toMatchObject({ code: 'medical', title: 'Visite médicale', reminderDays: [30, 7] });
    });

    it('l operateur type un fichier envoye par l ancienne app, pas celui d un autre Kasiman', async () => {
      const editor = await createOperator(ds, ['Drivers_Edit']);
      const admin = new AdminDriverDocumentResolver(docs, ds, ctx(editor));
      const legacy = await media(k(0)); // POST /upload_document de l'app installee
      const res = await admin.createDriverDocument({
        driverId: k(0),
        typeId: types.vehicle_registration,
        mediaId: legacy,
      });
      expect(res.document).toMatchObject({ status: 'approved', mediaId: legacy, reviewedByOperatorId: editor });
      expect(
        await errorOf(admin.createDriverDocument({ driverId: k(0), typeId: types.badge, mediaId: await media(k(1)), expiresAt: day(9) })),
      ).toBe('Fichier introuvable.');
    });
  });

  describe('controle kyc-check (file kasi-dispatch)', () => {
    it('document obligatoire expire : Kasiman suspendu, retire de Redis, une push ; rejeu sans effet', async () => {
      await driverRedis.setLocation(k(0), PLATEAU);
      await approved(k(0), types.driving_license, day(-1));
      await approved(k(1), types.badge, day(-1)); // facultatif : pas de suspension

      const run = await check.run(todayAt(3));
      expect(run).toEqual({ expired: 2, suspended: [k(0)], reminded: 0 });
      const row = await driverRow(k(0));
      expect(row.status).toBe(DriverStatus.SoftReject);
      expect(row.documentsNote).toBe(
        "Document expiré : Permis de conduire. Envoyez un document à jour depuis l'application.",
      );
      expect(row.documentsSuspendedAt).not.toBeNull();
      expect(await redis.zscore('driver', String(k(0)))).toBeNull();
      expect((await driverRow(k(1))).status).toBe(DriverStatus.Online);
      expect(pushes()).toHaveLength(1);
      expect(pushes()[0].args[1]).toBe('Compte suspendu');

      expect(await check.run(todayAt(4))).toEqual({ expired: 0, suspended: [], reminded: 0 });
      expect(pushes()).toHaveLength(1);
    });

    it('document valide de remplacement : pas de suspension ; Kasiman en course : suspendu au passage suivant', async () => {
      await approved(k(0), types.driving_license, day(-1));
      await ds.query(`UPDATE driver_document SET status = 'expired' WHERE "driverId" = $1`, [k(0)]);
      await approved(k(0), types.driving_license, day(200));
      await approved(k(1), types.driving_license, day(-1));
      await ds.query(`UPDATE driver SET status = 'in service' WHERE id = $1`, [k(1)]);

      expect((await check.run(todayAt(5))).suspended).toEqual([]);
      expect((await driverRow(k(1))).status).toBe(DriverStatus.InService);
      await ds.query(`UPDATE driver SET status = 'online' WHERE id = $1`, [k(1)]); // fin de course
      expect((await check.run(todayAt(6))).suspended).toEqual([k(1)]);
      expect((await driverRow(k(0))).status).toBe(DriverStatus.Online);
    });

    it('rappels : une push par seuil, rattrapage, seulement entre 8 h et 21 h', async () => {
      const doc = await approved(k(0), types.driving_license, day(10));
      expect((await check.run(todayAt(6))).reminded).toBe(0); // la nuit : rien
      expect((await check.run(todayAt(9))).reminded).toBe(1); // seuil J-14 (rattrape J-30)
      expect(pushes()[0].args.slice(1)).toEqual([
        'Document bientôt expiré',
        `Votre document « Permis de conduire » expire le ${day(10).split('-').reverse().join('/')} (dans 10 jours). ` +
          "Envoyez le nouveau dans l'application pour éviter la suspension.",
      ]);
      expect((await check.run(todayAt(10))).reminded).toBe(0); // rejeu le meme jour
      await ds.query(`UPDATE driver_document SET "expiresAt" = $2 WHERE id = $1`, [doc, day(7)]);
      expect((await check.run(todayAt(11))).reminded).toBe(1); // seuil J-7
      expect(pushes()).toHaveLength(2);
    });
  });

  describe('statut du Kasiman', () => {
    it('suspendu : ne peut plus se remettre en ligne ; reactive par la validation du document a jour', async () => {
      await approved(k(0), types.driving_license, day(-1));
      await check.run(todayAt(3));
      const self = queryService(k(0));
      expect((await self.updateOne(k(0), { status: DriverStatus.Online } as never)).status).toBe(
        DriverStatus.SoftReject,
      );
      expect((await self.updateOne(k(0), { status: DriverStatus.Offline } as never)).status).toBe(
        DriverStatus.SoftReject,
      );
      // Flux de l'app installee : renvoi des documents, puis attente de validation.
      expect((await self.updateOne(k(0), { status: DriverStatus.PendingApproval } as never)).status).toBe(
        DriverStatus.PendingApproval,
      );

      const editor = await createOperator(ds, ['Drivers_Edit']);
      const admin = new AdminDriverDocumentResolver(docs, ds, ctx(editor));
      const res = await admin.createDriverDocument({
        driverId: k(0),
        typeId: types.driving_license,
        mediaId: await media(k(0)),
        expiresAt: day(365),
      });
      expect(res.reinstated).toBe(true);
      expect(await driverRow(k(0))).toMatchObject({
        status: DriverStatus.Offline,
        documentsNote: null,
        documentsSuspendedAt: null,
      });
      expect((await self.updateOne(k(0), { status: DriverStatus.Online } as never)).status).toBe(DriverStatus.Online);
    });

    it('statuts refuses par le panel ou expiration avant le controle : pas de mise en ligne', async () => {
      await ds.query(`UPDATE driver SET status = 'blocked' WHERE id = $1`, [k(1)]);
      expect((await queryService(k(1)).updateOne(k(1), { status: DriverStatus.Online } as never)).status).toBe(
        DriverStatus.Blocked,
      );
      expect((await queryService(k(1)).updateOne(k(1), { status: DriverStatus.InService } as never)).status).toBe(
        DriverStatus.Blocked,
      );
      // Hors ligne, document deja passe `expired` mais pas encore suspendu.
      await ds.query(`UPDATE driver SET status = 'offline' WHERE id = $1`, [k(0)]);
      await approved(k(0), types.driving_license, day(-1));
      await docs.expireDue(day(0));
      expect((await queryService(k(0)).updateOne(k(0), { status: DriverStatus.Online } as never)).status).toBe(
        DriverStatus.Offline,
      );
    });
  });
});
