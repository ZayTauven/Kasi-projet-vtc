import { Inject, Injectable, Logger } from '@nestjs/common';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { RequestEntity } from '@kasi/database/request.entity';
import { blockedForDebtDriverIds } from '@kasi/order/debt-limit';
import { dispatchConfig, UNSERVED_DEMAND_PUSH } from '@kasi/order/dispatch-config';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { DataSource, In } from 'typeorm';

export interface UnservedResult {
  /** Demande inscrite (faux : deja inscrite, rejeu). */
  recorded: boolean;
  /** Alerte « forte demande » partie sur cette demande. */
  alerted: boolean;
  /** Kasimen prevenus par l'alerte. */
  notified: number[];
}

/** Verrou transactionnel : une seule decision d'alerte a la fois. */
const ALERT_LOCK = `SELECT pg_advisory_xact_lock(hashtext('kasi:unserved-demand-alert'))`;
const POINT = (lng: string, lat: string) => `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

/**
 * p2-dispatch D6 (2026-10-20) : demande non servie (`dira-r-nonservi`, Q12).
 *
 * Chaque course dispatchee par vagues puis passee en « aucun Kasiman » est
 * inscrite dans `unserved_demand` avec son point de depart (une fois par
 * course : rejeu et cron sans doublon). Quand 3 demandes non servies tombent
 * a moins de 1 km en 15 min, les Kasimen en ligne a moins de 5 km recoivent
 * une push, une fois par zone et par heure : aucune autre alerte tant qu'une
 * demande alertee de moins d'une heure se trouve a moins de 1 km. La
 * decision est prise sous verrou (deux expirations simultanees = une push).
 * Reglages : `DISPATCH_UNSERVED_*` (dispatch-config.ts).
 */
@Injectable()
export class UnservedDemandService {
  private readonly logger = new Logger(UnservedDemandService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly driverRedisService: DriverRedisService,
    @Inject(DRIVER_NOTIFICATION_SERVICE)
    private readonly driverNotificationService: IDriverNotificationService,
  ) {}

  async record(order: RequestEntity, driversSolicited: number): Promise<UnservedResult> {
    const config = dispatchConfig();
    const pickup = order.points?.[0];
    if (pickup == null) return { recorded: false, alerted: false, notified: [] };
    const inserted: Array<{ id: number }> = await this.dataSource.query(
      `INSERT INTO "unserved_demand" ("requestId", "serviceId", "point", "driversSolicited")
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
       ON CONFLICT ("requestId") DO NOTHING RETURNING "id"`,
      [order.id, order.serviceId, pickup.lng, pickup.lat, driversSolicited],
    );
    if (inserted.length === 0) return { recorded: false, alerted: false, notified: [] };
    const demandId = Number(inserted[0].id);

    const alerted = await this.dataSource.transaction(async (manager) => {
      await manager.query(ALERT_LOCK);
      const recent = await manager.query(
        `SELECT 1 FROM "unserved_demand"
          WHERE "alertedAt" > now() - make_interval(secs => $3::double precision / 1000)
            AND ST_DWithin("point"::geography, ${POINT('$1', '$2')}, $4)
          LIMIT 1`,
        [pickup.lng, pickup.lat, config.unservedAlertCooldownMs, config.unservedRadiusM],
      );
      if (recent.length > 0) return false;
      const [{ n }] = await manager.query(
        `SELECT count(*)::int AS n FROM "unserved_demand"
          WHERE "createdAt" > now() - make_interval(secs => $3::double precision / 1000)
            AND ST_DWithin("point"::geography, ${POINT('$1', '$2')}, $4)`,
        [pickup.lng, pickup.lat, config.unservedWindowMs, config.unservedRadiusM],
      );
      if (Number(n) < config.unservedThreshold) return false;
      await manager.query(`UPDATE "unserved_demand" SET "alertedAt" = now() WHERE "id" = $1`, [demandId]);
      return true;
    });
    if (!alerted) return { recorded: true, alerted: false, notified: [] };

    // Alerte decidee (et marquee) : la push part au plus une fois, meme en cas
    // d'echec partiel des envois.
    let notified: number[] = [];
    try {
      const close = await this.driverRedisService.getCloseByDistance(pickup, config.unservedAlertRadiusM);
      const online =
        close.length > 0
          ? await this.dataSource.getRepository(DriverEntity).find({
              where: { id: In(close.map((x) => x.driverId)), status: DriverStatus.Online },
            })
          : [];
      // p2-dispatch D7 (2026-10-20) : un Kasiman bloque pour dette (I3) ne
      // recevrait aucune de ces courses ; « Restez en ligne pour recevoir leurs
      // courses » lui serait trompeur (essai D7 : il etait le seul alerte).
      const blocked = await blockedForDebtDriverIds(
        this.dataSource.manager,
        online.map((x) => x.id),
        order.currency,
      );
      const drivers = online.filter((x) => !blocked.has(x.id));
      for (const driver of drivers) {
        await this.driverNotificationService.plainText(driver, UNSERVED_DEMAND_PUSH.title, UNSERVED_DEMAND_PUSH.body);
      }
      notified = drivers.map((x) => x.id);
      await this.dataSource.query(`UPDATE "unserved_demand" SET "alertedDrivers" = $2 WHERE "id" = $1`, [
        demandId,
        notified.length,
      ]);
    } catch (error) {
      this.logger.warn(`Alerte de demande non servie incomplete (course ${order.id}) : ${(error as Error).message}`);
    }
    this.logger.log(
      `Demande non servie (course ${order.id}) : alerte a ${notified.length} Kasiman(s) en ligne a moins de ` +
        `${config.unservedAlertRadiusM} m.`,
    );
    return { recorded: true, alerted: true, notified };
  }
}
