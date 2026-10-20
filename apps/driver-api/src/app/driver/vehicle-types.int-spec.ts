/**
 * p2-vehicules et p2-kyc K4 (2026-10-20) : type de vehicule du Kasiman.
 * Dispatch (service et vehicule), choix du type par le Kasiman, documents
 * exiges par vehicule, approbation d'un nouveau Kasiman par le panel.
 * Contre PostgreSQL et Redis reels ; fiche : docs/fiche-vehicules.md.
 *
 *   npm run test:integration -- vehicle-types
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
  createWorld,
  errorOf,
  openDataSource,
  openRedis,
  resetDatabase,
  World,
} from '../../../../../tools/test-integration/harness';
import { DriverEntity } from '../../../../../libs/database/src/lib/entities/driver.entity';
import { DriverStatus } from '../../../../../libs/database/src/lib/entities/enums/driver-status.enum';
import { VehicleType } from '../../../../../libs/database/src/lib/entities/enums/vehicle-type.enum';
import { ServiceEntity } from '../../../../../libs/database/src/lib/entities/service.entity';
import { DriverDocumentService } from '../../../../../libs/database/src/lib/order/driver-document.service';
import { DRIVER_PUSH, RIDER_PUSH } from '../../../../../libs/database/src/lib/order/firebase-notification-service/push-texts';
import { SharedDriverService } from '../../../../../libs/database/src/lib/order/shared-driver.service';
import { DriverRedisService } from '../../../../../libs/database/src/lib/redis/driver-redis.service';
import { AdminDriverQueryService } from '../../../../admin-api/src/app/driver/driver-query.service';
import { DriverDocumentResolver } from '../kyc/driver-document.resolver';
import { DriverQueryService } from './driver-query.service';

const DAY = 24 * 3600 * 1000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

describe('p2-vehicules : type de vehicule du Kasiman', () => {
  let ds: DataSource;
  let redis: Redis;
  let world: World;
  let shared: SharedDriverService;
  let driverRedis: DriverRedisService;

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
    world = await createWorld(ds, { drivers: 3 });
    driverRedis = new DriverRedisService(redis);
    shared = new SharedDriverService(ds.getRepository(DriverEntity), {} as never, {} as never);
    for (const id of world.driverIds) {
      await ds.query(`INSERT INTO driver_services_service ("driverId", "serviceId") VALUES ($1, $2)`, [
        id,
        world.serviceId,
      ]);
    }
  });

  const k = (i: number) => world.driverIds[i];
  const setType = (id: number, type: VehicleType | null) =>
    ds.query(`UPDATE driver SET "vehicleType" = $2 WHERE id = $1`, [id, type]);
  const setStatus = (id: number, status: string) => ds.query(`UPDATE driver SET status = $2 WHERE id = $1`, [id, status]);
  const row = async (id: number) =>
    (await ds.query(`SELECT status, "vehicleType" FROM driver WHERE id = $1`, [id]))[0] as {
      status: string;
      vehicleType: string | null;
    };
  const ctx = (id: number) => ({ req: { user: { id } } }) as never;
  const driverApi = (id: number) =>
    new DriverQueryService(ds.getRepository(DriverEntity), ds.getRepository(ServiceEntity), driverRedis, ctx(id));
  const adminApi = () => new AdminDriverQueryService(ds.getRepository(DriverEntity));

  it('dispatch : le service ne sollicite que les vehicules admis ; vide = tous ; sans type = accepte', async () => {
    await setType(k(0), VehicleType.Motorcycle);
    await setType(k(1), VehicleType.Car);
    const ids = async () =>
      (await shared.getOnlineDriversWithServiceId(world.driverIds, world.serviceId)).map((x) => x.id).sort();
    expect(await ids()).toEqual([k(0), k(1), k(2)].sort());
    await ds.query(`UPDATE service SET "vehicleTypes" = '{Motorcycle}' WHERE id = $1`, [world.serviceId]);
    expect(await ids()).toEqual([k(0), k(2)].sort());
    await ds.query(`UPDATE service SET "vehicleTypes" = '{Car,Van}' WHERE id = $1`, [world.serviceId]);
    expect(await ids()).toEqual([k(1), k(2)].sort());
  });

  it('choix du type : libre avant approbation, une fois si absent, plus ensuite', async () => {
    await setStatus(k(0), DriverStatus.WaitingDocuments);
    await driverApi(k(0)).updateOne(k(0), { vehicleType: VehicleType.Motorcycle });
    expect((await row(k(0))).vehicleType).toBe('Motorcycle');
    await driverApi(k(0)).updateOne(k(0), { vehicleType: VehicleType.Van });
    expect((await row(k(0))).vehicleType).toBe('Van');
    // Actif sans type (inscrit avant p2-vehicules) : il le renseigne une fois.
    await setStatus(k(1), DriverStatus.Offline);
    await driverApi(k(1)).updateOne(k(1), { vehicleType: VehicleType.Car });
    expect((await row(k(1))).vehicleType).toBe('Car');
    await driverApi(k(1)).updateOne(k(1), { vehicleType: VehicleType.Motorcycle, firstName: 'Awa' });
    expect(await row(k(1))).toEqual({ status: 'offline', vehicleType: 'Car' });
    expect((await ds.query(`SELECT "firstName" FROM driver WHERE id = $1`, [k(1)]))[0].firstName).toBe('Awa');
  });

  describe('p2-kyc K4 : documents exiges par vehicule', () => {
    const types: Record<string, number> = {};
    let docs: DriverDocumentService;
    beforeEach(async () => {
      docs = new DriverDocumentService(ds);
      const catalog: Array<[string, string, boolean]> = [
        ['driving_license', '{}', true],
        ['taxi_license', '{Car}', true],
        ['helmet', '{Motorcycle}', false],
      ];
      for (const [code, vehicles, required] of catalog) {
        const [{ id }] = await ds.query(
          `INSERT INTO driver_document_type (code, title, "vehicleTypes", "isRequired", "hasExpiryDate")
           VALUES ($1, $1, $2, $3, true) RETURNING id`,
          [code, vehicles, required],
        );
        types[code] = Number(id);
      }
    });
    const approve = (driverId: number, typeId: number, expiresAt = day(90)) =>
      ds.query(
        `INSERT INTO driver_document ("driverId", "typeId", "expiresAt", status) VALUES ($1, $2, $3, 'approved')`,
        [driverId, typeId, expiresAt],
      );

    it('catalogue du Kasiman et documents manquants selon son vehicule', async () => {
      await setType(k(0), VehicleType.Motorcycle);
      await setType(k(1), VehicleType.Car);
      const codes = async (id: number) =>
        (await new DriverDocumentResolver(docs, ctx(id)).driverDocumentTypes()).map((t) => t.code);
      expect(await codes(k(0))).toEqual(['driving_license', 'helmet']);
      expect(await codes(k(1))).toEqual(['driving_license', 'taxi_license']);
      expect(await codes(k(2))).toEqual(['driving_license', 'taxi_license', 'helmet']);
      expect(await docs.missingTitles(k(0))).toEqual(['driving_license']);
      expect(await docs.missingTitles(k(1))).toEqual(['driving_license', 'taxi_license']);
      await approve(k(1), types.taxi_license);
      expect(await docs.missingTitles(k(1))).toEqual(['driving_license']);
    });

    it('approbation par le panel : type et documents obligatoires exiges ; Kasiman actif non concerne', async () => {
      await setStatus(k(0), DriverStatus.PendingApproval);
      const noType = await errorOf(adminApi().updateOne(k(0), { status: DriverStatus.Offline }));
      expect(noType).toMatch(/^Type de v.hicule non renseign/);
      const missing = await errorOf(
        adminApi().updateOne(k(0), { status: DriverStatus.Offline, vehicleType: VehicleType.Car }),
      );
      expect(missing).toMatch(/: driving_license, taxi_license\.$/);
      expect(await row(k(0))).toEqual({ status: 'pending approval', vehicleType: 'Car' });
      await approve(k(0), types.driving_license);
      await approve(k(0), types.taxi_license);
      await adminApi().updateOne(k(0), { status: DriverStatus.Offline });
      expect(await row(k(0))).toEqual({ status: 'offline', vehicleType: 'Car' });
      // Deja actif, sans document : le panel le passe hors ligne librement.
      await adminApi().updateOne(k(1), { status: DriverStatus.Offline });
      expect((await row(k(1))).status).toBe('offline');
    });

    it('suspension : seul un document exige pour son vehicule suspend le Kasiman', async () => {
      await setType(k(0), VehicleType.Motorcycle);
      await setType(k(1), VehicleType.Car);
      await approve(k(0), types.taxi_license, day(-1));
      await approve(k(1), types.taxi_license, day(-1));
      await docs.expireDue(day(0));
      expect((await docs.suspendBlocked()).map((x) => x.driverId)).toEqual([k(1)]);
      expect((await row(k(0))).status).toBe('online');
      expect((await row(k(1))).status).toBe('soft reject');
    });
  });

  it('bug-push-anglais : textes des push en francais', () => {
    const texts = JSON.stringify([
      DRIVER_PUSH,
      DRIVER_PUSH.assigned('12:30', 'Plateau', 'Almadies'),
      RIDER_PUSH,
      RIDER_PUSH.bookingAssigned('12:30'),
    ]);
    expect(texts).not.toMatch(/\b(Trip|Started|Arrived|Canceled|Finished|Driver|Your|has been)\b/);
    expect(RIDER_PUSH.started.title).toBe('Course commencée');
  });
});
