import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { json2csv } from 'json-2-csv';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

import {
  PilotCancelReasonDTO,
  PilotDashboardDTO,
  PilotExportDTO,
  PilotIndicatorsDTO,
  PilotKasimanDTO,
  PilotKasimenDTO,
  PilotMoneyDTO,
  PilotWeekDTO,
  PilotZoneDTO,
} from './dto/pilot-dashboard.dto';
import {
  PILOT_CURRENCY,
  PILOT_LOW_SCORE_MAX,
  PILOT_MAX_DAYS,
  PILOT_MONTH_DAYS,
  PILOT_SCORE_PER_STAR,
  PILOT_THRESHOLDS,
  PILOT_TOP_KASIMEN,
  PILOT_TOP_REASONS,
  PILOT_TOP_ZONES,
} from './pilot-insights.constants';

/**
 * p3-mesures M1 et M3 (2026-10-21) : indicateurs du pilote
 * (docs/fiche-mesures-pilote.md §3). Lecture seule, SQL PostgreSQL agrege,
 * aucune table ni migration.
 *
 * Conventions (KASI_DECISIONS.md, 2026-10-21) :
 * - semaine = `date_trunc('week', ...)` (lundi 00:00), heure de Dakar = UTC ;
 * - une course appartient a la semaine de sa commande (`requestTimestamp`) ;
 *   ses offres, son avis et sa demande non servie la suivent ;
 * - l'argent appartient a la semaine de son ecriture au grand livre ;
 * - `from` inclus, `to` exclu ; chaque semaine est bornee par la periode ;
 * - PostgreSQL renvoie count et sum en texte : casts `::int` / `::float8`.
 */

export type PilotFamily = 'all' | 'people' | 'parcels';
export const PILOT_FAMILIES: PilotFamily[] = ['all', 'people', 'parcels'];

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Une tranche du tableau : une semaine, ou la periode entiere (`key` = total). */
export interface PilotSlice {
  key: string;
  weekStart: Date | null;
  start: Date;
  end: Date;
}

/** Lundi 00:00 UTC de la semaine de `date` (meme borne que `date_trunc('week')`). */
export function weekStartOf(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS);
}

export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Semaines qui touchent [from, to), bornees par la periode, puis la periode entiere. */
export function pilotSlices(from: Date, to: Date): PilotSlice[] {
  const slices: PilotSlice[] = [];
  for (let w = weekStartOf(from).getTime(); w < to.getTime(); w += WEEK_MS) {
    const weekStart = new Date(w);
    slices.push({
      key: dayKey(weekStart),
      weekStart,
      start: new Date(Math.max(w, from.getTime())),
      end: new Date(Math.min(w + WEEK_MS, to.getTime())),
    });
  }
  slices.push({ key: 'total', weekStart: null, start: from, end: to });
  return slices;
}

export function checkPilotPeriod(from: Date, to: Date): void {
  const valid =
    from instanceof Date &&
    to instanceof Date &&
    !Number.isNaN(from.getTime()) &&
    !Number.isNaN(to.getTime()) &&
    from.getTime() < to.getTime() &&
    to.getTime() - from.getTime() <= PILOT_MAX_DAYS * DAY_MS;
  if (!valid) {
    throw new GraphQLError(
      `Periode invalide : from doit preceder to, ${PILOT_MAX_DAYS} jours au plus.`,
      { extensions: { code: 'PILOT_PERIOD_INVALID' } },
    );
  }
}

/** Projection mensuelle : courses terminees ramenees a 30 jours ecoules. */
export function monthlyProjection(completed: number, slice: PilotSlice, now: Date): number | null {
  const days = (Math.min(slice.end.getTime(), now.getTime()) - slice.start.getTime()) / DAY_MS;
  return days > 0 ? (completed * PILOT_MONTH_DAYS) / days : null;
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

/** Bornes passees en ISO (UTC), comparees a des `timestamp` sans fuseau stockes en UTC. */
const FROM = `($1::timestamptz AT TIME ZONE 'UTC')`;
const TO = `($2::timestamptz AT TIME ZONE 'UTC')`;
const COMPLETED = `('WaitingForReview', 'Finished')`;
const FAMILY = `CASE WHEN s."orderType"::text = 'Delivery' THEN 'parcels' ELSE 'people' END`;
const WEEK_OF = (column: string) => `to_char(date_trunc('week', ${column}), 'YYYY-MM-DD')`;

/**
 * Une ligne par course commandee dans la periode : semaine, famille, premiere
 * acceptation (`DriverAccepted`), reservation (`Booked*`), annulation operateur.
 */
const FACTS = `
  WITH facts AS (
    SELECT r."id", r."riderId", r."driverId", r."status"::text AS "status", r."cancelReasonId",
           r."requestTimestamp" AS "ts",
           ${WEEK_OF('r."requestTimestamp"')} AS "week",
           ${FAMILY} AS "family",
           act."acceptedAt",
           COALESCE(act."booked", false) AS "booked",
           COALESCE(act."operatorCanceled", false) AS "operatorCanceled"
      FROM "request" r
      JOIN "service" s ON s."id" = r."serviceId"
      LEFT JOIN LATERAL (
        SELECT min(a."createdAt") FILTER (WHERE a."type" = 'DriverAccepted') AS "acceptedAt",
               bool_or(a."type" IN ('BookedByRider', 'BookedByOperator')) AS "booked",
               bool_or(a."type" = 'CanceledByOperator') AS "operatorCanceled"
          FROM "request_activity" a
         WHERE a."requestId" = r."id"
      ) act ON TRUE
     WHERE r."requestTimestamp" >= ${FROM} AND r."requestTimestamp" < ${TO}
  )`;

const CANCELED = `('RiderCanceled', 'DriverCanceled')`;
const EXPIRED = `('Expired', 'NotFound', 'NoCloseFound')`;

/** Semaine x famille, semaine, famille, periode (+ colonnes supplementaires). */
function groupingSets(extra: string[] = []): string {
  const sets = [['"week"', '"family"'], ['"week"'], ['"family"'], []].map(
    (set) => `(${[...set, ...extra].join(', ')})`,
  );
  return `GROUPING SETS (${sets.join(', ')})`;
}

interface Keyed {
  week: string | null;
  family: string | null;
}
const keyOf = (row: Keyed): string => `${row.week ?? 'total'}|${row.family ?? 'all'}`;

interface OrderRow extends Keyed {
  ordered: number;
  completed: number;
  riderBefore: number;
  riderAfter: number;
  driverCanceled: number;
  expired: number;
  operatorCanceled: number;
  assigned: number;
  assignedImmediate: number;
  median: number | null;
  p90: number | null;
}

interface OfferRow extends Keyed {
  accepted: number;
  rejected: number;
  noAnswer: number;
  expired: number;
  averageWave: number | null;
}

interface ReasonRow extends Keyed {
  reasonId: number;
  title: string;
  userType: AnnouncementUserType;
  n: number;
}

interface CellRow extends Keyed {
  lat: number;
  lng: number;
  demands: number;
  alerts: number;
}

interface ReviewRow extends Keyed {
  reviews: number;
  avgScore: number | null;
  low: number;
}

interface PersonWeekRow {
  id: number;
  week: string;
  family: 'people' | 'parcels';
  n: number;
  inPeriod: number;
}

interface FirstRow {
  id: number;
  family: 'people' | 'parcels';
  firstMs: number;
}

/** Activite hebdomadaire : famille -> semaine -> personne -> courses terminees. */
type Activity = Map<string, Map<string, Map<number, { n: number; inPeriod: number }>>>;

function activityOf(rows: PersonWeekRow[]): Activity {
  const activity: Activity = new Map(PILOT_FAMILIES.map((f) => [f, new Map()]));
  for (const row of rows) {
    for (const family of ['all', row.family]) {
      const weeks = activity.get(family)!;
      if (!weeks.has(row.week)) weeks.set(row.week, new Map());
      const people = weeks.get(row.week)!;
      const current = people.get(Number(row.id)) ?? { n: 0, inPeriod: 0 };
      current.n += Number(row.n);
      current.inPeriod += Number(row.inPeriod);
      people.set(Number(row.id), current);
    }
  }
  return activity;
}

/** Premiere course terminee (ms) de chaque personne, par famille et tous services. */
function firstsOf(rows: FirstRow[]): Map<string, Map<number, number>> {
  const firsts = new Map<string, Map<number, number>>(PILOT_FAMILIES.map((f) => [f, new Map()]));
  for (const row of rows) {
    const id = Number(row.id);
    const ms = Number(row.firstMs);
    firsts.get(row.family)!.set(id, ms);
    const all = firsts.get('all')!;
    all.set(id, Math.min(all.get(id) ?? Infinity, ms));
  }
  return firsts;
}

const within = (ms: number | undefined, slice: PilotSlice): boolean =>
  ms != null && ms >= slice.start.getTime() && ms < slice.end.getTime();

function emptyIndicators(): PilotIndicatorsDTO {
  return {
    orders: {
      ordered: 0,
      completed: 0,
      riderCanceledBeforeAssignment: 0,
      riderCanceledAfterAssignment: 0,
      driverCanceled: 0,
      expired: 0,
      operatorCanceled: 0,
      monthlyProjection: null,
    },
    assignment: { assigned: 0, medianSeconds: null, p90Seconds: null },
    service: { assigned: 0, eligible: 0, rate: null },
    offers: { accepted: 0, rejected: 0, noAnswer: 0, expired: 0, rate: null, averageWave: null },
    cancellations: {
      riderBeforeAssignmentRate: null,
      riderAfterAssignmentRate: null,
      driverRate: null,
      topReasons: [],
    },
    money: null,
    kasimen: { active: 0, new: 0, retained: 0, retentionBase: 0, retentionRate: null },
    clients: { active: 0, recurring: 0, new: 0, recurringRate: null },
    unserved: { expired: 0, demands: 0, alerts: 0, zones: [] },
    satisfaction: { reviews: 0, averageStars: null, lowRatingShare: null },
  };
}

@Injectable()
export class PilotInsightsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Indicateurs 1 a 9, par semaine et sur la periode, tous services et par
   * famille. `withMoney` faux (pas de ProviderWallet_View) : `money` vaut null.
   */
  async dashboard(from: Date, to: Date, withMoney: boolean, now = new Date()): Promise<PilotDashboardDTO> {
    checkPilotPeriod(from, to);
    const slices = pilotSlices(from, to);
    const params = [from.toISOString(), to.toISOString()];
    const [orders, offers, reasons, cells, reviews, kasimen, clients, money] = await Promise.all([
      this.orderRows(params),
      this.offerRows(params),
      this.reasonRows(params),
      this.unservedRows(params),
      this.reviewRows(params),
      this.personActivity('driverId', params),
      this.personActivity('riderId', params),
      withMoney ? this.moneyBySlice(slices, params) : Promise.resolve(null),
    ]);

    const indicators = new Map<string, PilotIndicatorsDTO>();
    for (const slice of slices) {
      for (const family of PILOT_FAMILIES) indicators.set(`${slice.key}|${family}`, emptyIndicators());
    }
    const at = (row: Keyed) => indicators.get(keyOf(row));

    // 1, 2, 3a, 4 (taux), 8 (expirees)
    for (const row of orders) {
      const ind = at(row);
      if (ind == null) continue;
      ind.orders = {
        ordered: row.ordered,
        completed: row.completed,
        riderCanceledBeforeAssignment: row.riderBefore,
        riderCanceledAfterAssignment: row.riderAfter,
        driverCanceled: row.driverCanceled,
        expired: row.expired,
        operatorCanceled: row.operatorCanceled,
        monthlyProjection: null,
      };
      ind.assignment = {
        assigned: row.assignedImmediate,
        medianSeconds: row.median,
        p90Seconds: row.p90,
      };
      const eligible = row.ordered - row.riderBefore;
      ind.service = { assigned: row.assigned, eligible, rate: ratio(row.assigned, eligible) };
      ind.cancellations.riderBeforeAssignmentRate = ratio(row.riderBefore, row.ordered);
      ind.cancellations.riderAfterAssignmentRate = ratio(row.riderAfter, row.ordered);
      ind.cancellations.driverRate = ratio(row.driverCanceled, row.ordered);
      ind.unserved.expired = row.expired;
    }

    // 3b
    for (const row of offers) {
      const ind = at(row);
      if (ind == null) continue;
      const answered = row.accepted + row.rejected + row.noAnswer + row.expired;
      ind.offers = {
        accepted: row.accepted,
        rejected: row.rejected,
        noAnswer: row.noAnswer,
        expired: row.expired,
        rate: ratio(row.accepted, answered),
        averageWave: row.averageWave,
      };
    }

    // 4 (motifs, BetterSuite cancel-reason-insights)
    for (const row of reasons) {
      at(row)?.cancellations.topReasons.push({
        reasonId: Number(row.reasonId),
        title: row.title,
        userType: row.userType,
        canceledBy: null,
        count: row.n,
      });
    }

    // 8 (alertes et zones)
    for (const row of cells) {
      const ind = at(row);
      if (ind == null) continue;
      ind.unserved.demands += row.demands;
      ind.unserved.alerts += row.alerts;
      ind.unserved.zones.push({ lat: row.lat, lng: row.lng, demands: row.demands, alerts: row.alerts });
    }

    // 9
    for (const row of reviews) {
      const ind = at(row);
      if (ind == null) continue;
      ind.satisfaction = {
        reviews: row.reviews,
        averageStars: row.avgScore == null ? null : row.avgScore / PILOT_SCORE_PER_STAR,
        lowRatingShare: ratio(row.low, row.reviews),
      };
    }

    for (const slice of slices) {
      for (const family of PILOT_FAMILIES) {
        const ind = indicators.get(`${slice.key}|${family}`)!;
        ind.orders.monthlyProjection = monthlyProjection(ind.orders.completed, slice, now);
        ind.cancellations.topReasons = ind.cancellations.topReasons
          .sort((a, b) => b.count - a.count || Number(a.reasonId) - Number(b.reasonId))
          .slice(0, PILOT_TOP_REASONS);
        ind.unserved.zones = ind.unserved.zones
          .sort((a: PilotZoneDTO, b: PilotZoneDTO) =>
            b.demands - a.demands || b.alerts - a.alerts || a.lat - b.lat || a.lng - b.lng,
          )
          .slice(0, PILOT_TOP_ZONES);
      }
    }

    // 6 et 7
    this.fillKasimen(kasimen.activity, kasimen.firsts, slices, indicators);
    this.fillClients(clients.activity, clients.firsts, slices, indicators);

    // 5 : tous services seulement (les reglements de dette ne sont pas
    // rattaches a une course), et avec la permission.
    if (money != null) {
      for (const slice of slices) {
        indicators.get(`${slice.key}|all`)!.money = money.get(slice.key) ?? null;
      }
    }

    const week = (slice: PilotSlice): PilotWeekDTO => ({
      weekStart: slice.weekStart,
      start: slice.start,
      end: slice.end,
      all: indicators.get(`${slice.key}|all`)!,
      people: indicators.get(`${slice.key}|people`)!,
      parcels: indicators.get(`${slice.key}|parcels`)!,
    });
    return {
      from,
      to,
      generatedAt: now,
      currency: PILOT_CURRENCY,
      moneyVisible: money != null,
      thresholds: { ...PILOT_THRESHOLDS },
      weeks: slices.filter((s) => s.weekStart != null).map(week),
      total: week(slices[slices.length - 1]),
    };
  }

  /**
   * Motifs d'annulation (BetterSuite `cancelReasonPopularityByName` et
   * `ByUserType`, reunis) : par auteur (client, Kasiman) et par motif, sans
   * motif compris (`reasonId` null).
   */
  async cancelReasons(from: Date, to: Date): Promise<PilotCancelReasonDTO[]> {
    checkPilotPeriod(from, to);
    const rows: PilotCancelReasonDTO[] = await this.dataSource.query(
      `${FACTS}
       SELECT CASE WHEN f."status" = 'RiderCanceled' THEN 'Rider' ELSE 'Driver' END AS "canceledBy",
              f."cancelReasonId" AS "reasonId", cr."title", cr."userType"::text AS "userType",
              count(*)::int AS "count"
         FROM facts f
         LEFT JOIN "order_cancel_reason" cr ON cr."id" = f."cancelReasonId"
        WHERE f."status" IN ${CANCELED}
        GROUP BY 1, 2, 3, 4
        ORDER BY "count" DESC, "canceledBy" DESC, "reasonId" ASC NULLS LAST`,
      [from.toISOString(), to.toISOString()],
    );
    return rows;
  }

  /**
   * Classement des Kasimen (BetterSuite `getTopEarningDrivers` et
   * `topTripsCompletedDrivers`, adaptes) : courses terminees commandees dans
   * la periode, puis gains (prix avant coupon - commission + pourboire, meme
   * base que l'ecran des gains de driver-app).
   */
  async topKasimen(from: Date, to: Date, limit = PILOT_TOP_KASIMEN): Promise<PilotKasimanDTO[]> {
    checkPilotPeriod(from, to);
    return this.dataSource.query(
      `SELECT r."driverId" AS "id",
              NULLIF(trim(concat_ws(' ', d."firstName", d."lastName")), '') AS "name",
              m."address" AS "avatarUrl",
              count(*)::int AS "completed",
              COALESCE(sum(r."costBest" - r."providerShare" + r."tipAmount"), 0)::float8 AS "earnings",
              min(r."currency") AS "currency"
         FROM "request" r
         JOIN "driver" d ON d."id" = r."driverId"
         LEFT JOIN "media" m ON m."id" = d."mediaId"
        WHERE r."status"::text IN ${COMPLETED}
          AND r."requestTimestamp" >= ${FROM} AND r."requestTimestamp" < ${TO}
        GROUP BY r."driverId", d."firstName", d."lastName", m."address"
        ORDER BY "completed" DESC, "earnings" DESC, r."driverId" ASC
        LIMIT $3`,
      [from.toISOString(), to.toISOString(), Math.min(Math.max(1, limit), 100)],
    );
  }

  /**
   * M3 : export CSV pour `p3-bilan`, une ligne par semaine et par famille, puis
   * la periode. Meme depot que l'export d'`accounting` (`uploads/`). Colonnes
   * d'argent vides sans ProviderWallet_View.
   */
  async exportCsv(dashboard: PilotDashboardDTO): Promise<PilotExportDTO> {
    const rows = [...dashboard.weeks, dashboard.total].flatMap((week) =>
      PILOT_FAMILIES.map((family) => csvRow(week, family, week[family])),
    );
    const csv = await json2csv(rows);
    const directory = join(process.cwd(), 'uploads');
    await mkdir(directory, { recursive: true });
    const fileName = `pilote-${dayKey(dashboard.from)}-${dayKey(dashboard.to)}-${Date.now()}.csv`;
    await writeFile(join(directory, fileName), csv);
    return { url: `uploads/${fileName}`, rows: rows.length };
  }

  // -------------------------------------------------------------------------

  private orderRows(params: string[]): Promise<OrderRow[]> {
    const immediate = `"acceptedAt" IS NOT NULL AND NOT "booked"`;
    const delay = `EXTRACT(EPOCH FROM ("acceptedAt" - "ts"))::float8`;
    return this.dataSource.query(
      `${FACTS}
       SELECT "week", "family",
              count(*)::int AS "ordered",
              count(*) FILTER (WHERE "status" IN ${COMPLETED})::int AS "completed",
              count(*) FILTER (WHERE "status" = 'RiderCanceled' AND "acceptedAt" IS NULL)::int AS "riderBefore",
              count(*) FILTER (WHERE "status" = 'RiderCanceled' AND "acceptedAt" IS NOT NULL)::int AS "riderAfter",
              count(*) FILTER (WHERE "status" = 'DriverCanceled')::int AS "driverCanceled",
              count(*) FILTER (WHERE "status" IN ${EXPIRED} AND NOT "operatorCanceled")::int AS "expired",
              count(*) FILTER (WHERE "operatorCanceled")::int AS "operatorCanceled",
              count(*) FILTER (WHERE "acceptedAt" IS NOT NULL)::int AS "assigned",
              count(*) FILTER (WHERE ${immediate})::int AS "assignedImmediate",
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY ${delay}) FILTER (WHERE ${immediate}))::float8 AS "median",
              (percentile_cont(0.9) WITHIN GROUP (ORDER BY ${delay}) FILTER (WHERE ${immediate}))::float8 AS "p90"
         FROM facts
        GROUP BY ${groupingSets()}`,
      params,
    );
  }

  private offerRows(params: string[]): Promise<OfferRow[]> {
    return this.dataSource.query(
      `${FACTS}
       SELECT f."week", f."family",
              count(*) FILTER (WHERE da."outcome" = 'accepted')::int AS "accepted",
              count(*) FILTER (WHERE da."outcome" = 'rejected')::int AS "rejected",
              count(*) FILTER (WHERE da."outcome" = 'no_answer')::int AS "noAnswer",
              count(*) FILTER (WHERE da."outcome" = 'expired')::int AS "expired",
              (avg(da."wave") FILTER (WHERE da."outcome" = 'accepted'))::float8 AS "averageWave"
         FROM "dispatch_attempt" da
         JOIN facts f ON f."id" = da."requestId"
        GROUP BY ${groupingSets().replace(/"week"/g, 'f."week"').replace(/"family"/g, 'f."family"')}`,
      params,
    );
  }

  private reasonRows(params: string[]): Promise<ReasonRow[]> {
    return this.dataSource.query(
      `${FACTS}
       SELECT g."week", g."family", g."reasonId", cr."title", cr."userType"::text AS "userType", g."n"
         FROM (
           SELECT "week", "family", "cancelReasonId" AS "reasonId", count(*)::int AS "n"
             FROM facts
            WHERE "status" IN ${CANCELED} AND "cancelReasonId" IS NOT NULL
            GROUP BY ${groupingSets(['"cancelReasonId"'])}
         ) g
         JOIN "order_cancel_reason" cr ON cr."id" = g."reasonId"`,
      params,
    );
  }

  private unservedRows(params: string[]): Promise<CellRow[]> {
    return this.dataSource.query(
      `${FACTS}
       SELECT "week", "family", "lat", "lng",
              count(*)::int AS "demands", count("alertedAt")::int AS "alerts"
         FROM (
           SELECT f."week", f."family", u."alertedAt",
                  round(ST_Y(u."point")::numeric, 2)::float8 AS "lat",
                  round(ST_X(u."point")::numeric, 2)::float8 AS "lng"
             FROM "unserved_demand" u
             JOIN facts f ON f."id" = u."requestId"
         ) c
        GROUP BY ${groupingSets(['"lat"', '"lng"'])}`,
      params,
    );
  }

  private reviewRows(params: string[]): Promise<ReviewRow[]> {
    return this.dataSource.query(
      `${FACTS}
       SELECT f."week", f."family", count(*)::int AS "reviews",
              avg(v."score")::float8 AS "avgScore",
              count(*) FILTER (WHERE v."score" <= ${PILOT_LOW_SCORE_MAX})::int AS "low"
         FROM "request_review" v
         JOIN facts f ON f."id" = v."requestId"
        GROUP BY ${groupingSets().replace(/"week"/g, 'f."week"').replace(/"family"/g, 'f."family"')}`,
      params,
    );
  }

  /**
   * Courses terminees par personne et par semaine. Kasimen : depuis la semaine
   * qui precede celle de `from` (retention de la 1re semaine). Plus la date de
   * la premiere course terminee de chaque personne vue, tout l'historique
   * (« nouveaux »).
   */
  private async personActivity(
    column: 'driverId' | 'riderId',
    params: string[],
  ): Promise<{ activity: Activity; firsts: Map<string, Map<number, number>> }> {
    const since =
      column === 'driverId' ? `date_trunc('week', ${FROM}) - interval '7 days'` : FROM;
    const rows: PersonWeekRow[] = await this.dataSource.query(
      `SELECT r."${column}" AS "id", ${WEEK_OF('r."requestTimestamp"')} AS "week", ${FAMILY} AS "family",
              count(*)::int AS "n",
              count(*) FILTER (WHERE r."requestTimestamp" >= ${FROM})::int AS "inPeriod"
         FROM "request" r
         JOIN "service" s ON s."id" = r."serviceId"
        WHERE r."status"::text IN ${COMPLETED} AND r."${column}" IS NOT NULL
          AND r."requestTimestamp" >= ${since} AND r."requestTimestamp" < ${TO}
        GROUP BY 1, 2, 3`,
      params,
    );
    const ids = [...new Set(rows.filter((r) => r.inPeriod > 0).map((r) => Number(r.id)))];
    const firstRows: FirstRow[] =
      ids.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT r."${column}" AS "id", ${FAMILY} AS "family",
                    (EXTRACT(EPOCH FROM min(r."requestTimestamp")) * 1000)::float8 AS "firstMs"
               FROM "request" r
               JOIN "service" s ON s."id" = r."serviceId"
              WHERE r."status"::text IN ${COMPLETED} AND r."${column}" = ANY($1::int[])
              GROUP BY 1, 2`,
            [ids],
          );
    return { activity: activityOf(rows), firsts: firstsOf(firstRows) };
  }

  /** 6 : actifs, retenus (S et S-1) / actifs S-1, nouveaux. */
  private fillKasimen(
    activity: Activity,
    firsts: Map<string, Map<number, number>>,
    slices: PilotSlice[],
    indicators: Map<string, PilotIndicatorsDTO>,
  ): void {
    const total = slices[slices.length - 1];
    for (const family of PILOT_FAMILIES) {
      const weeks = activity.get(family)!;
      const first = firsts.get(family)!;
      const periodActive = new Set<number>();
      let retained = 0;
      let base = 0;
      for (const slice of slices) {
        if (slice.weekStart == null) continue;
        const current = weeks.get(slice.key) ?? new Map();
        const previous = weeks.get(dayKey(new Date(slice.weekStart.getTime() - WEEK_MS))) ?? new Map();
        const active = [...current].filter(([, v]) => v.inPeriod > 0).map(([id]) => id);
        const before = new Set([...previous].filter(([, v]) => v.n > 0).map(([id]) => id));
        const kept = active.filter((id) => before.has(id)).length;
        active.forEach((id) => periodActive.add(id));
        retained += kept;
        base += before.size;
        indicators.get(`${slice.key}|${family}`)!.kasimen = kasimenOf(
          active.length,
          active.filter((id) => within(first.get(id), slice)).length,
          kept,
          before.size,
        );
      }
      indicators.get(`total|${family}`)!.kasimen = kasimenOf(
        periodActive.size,
        [...periodActive].filter((id) => within(first.get(id), total)).length,
        retained,
        base,
      );
    }
  }

  /** 7 : actifs, recurrents (2 courses terminees ou plus dans la tranche), nouveaux. */
  private fillClients(
    activity: Activity,
    firsts: Map<string, Map<number, number>>,
    slices: PilotSlice[],
    indicators: Map<string, PilotIndicatorsDTO>,
  ): void {
    for (const family of PILOT_FAMILIES) {
      const weeks = activity.get(family)!;
      const first = firsts.get(family)!;
      const period = new Map<number, number>();
      for (const slice of slices) {
        let counts: Map<number, number>;
        if (slice.weekStart == null) {
          counts = period;
        } else {
          counts = new Map(
            [...(weeks.get(slice.key) ?? new Map<number, { inPeriod: number }>())].map(([id, v]) => [id, v.inPeriod]),
          );
          counts.forEach((n, id) => period.set(id, (period.get(id) ?? 0) + n));
        }
        const active = [...counts].filter(([, n]) => n > 0).map(([id]) => id);
        const recurring = [...counts].filter(([, n]) => n >= 2).length;
        indicators.get(`${slice.key}|${family}`)!.clients = {
          active: active.length,
          recurring,
          new: active.filter((id) => within(first.get(id), slice)).length,
          recurringRate: ratio(recurring, active.length),
        };
      }
    }
  }

  /**
   * 5 : commission due (lignes COMMISSION des comptes KASIMAN, fins de course
   * avec especes), recouvree (lignes REGLEMENT des REGLEMENT_DETTE), encours et
   * Kasimen bloques en fin de tranche (soldes du grand livre a cette date,
   * plafond `money_policy` du moment).
   */
  private async moneyBySlice(slices: PilotSlice[], params: string[]): Promise<Map<string, PilotMoneyDTO>> {
    const flows: Array<{ week: string | null; due: number; recovered: number }> = await this.dataSource.query(
      `SELECT "week", COALESCE(sum("due"), 0)::float8 AS "due", COALESCE(sum("recovered"), 0)::float8 AS "recovered"
         FROM (
           SELECT ${WEEK_OF('e."createdAt"')} AS "week",
                  CASE WHEN e."nature" = 'FIN_COURSE' THEN -l."amount" ELSE 0 END AS "due",
                  CASE WHEN e."nature" = 'REGLEMENT_DETTE' THEN l."amount" ELSE 0 END AS "recovered"
             FROM "ledger_entry" e
             JOIN "ledger_line" l ON l."entryId" = e."id"
             JOIN "ledger_account" a ON a."id" = l."accountId"
            WHERE a."kind" = 'KASIMAN' AND e."currency" = $3
              AND e."createdAt" >= ${FROM} AND e."createdAt" < ${TO}
              AND ((e."nature" = 'FIN_COURSE' AND e."cashCollected" > 0 AND l."nature" = 'COMMISSION')
                OR (e."nature" = 'REGLEMENT_DETTE' AND l."nature" = 'REGLEMENT'))
         ) m
        GROUP BY GROUPING SETS (("week"), ())`,
      [...params, PILOT_CURRENCY],
    );
    const ends = [...new Set(slices.map((s) => s.end.toISOString()))];
    const balances: Array<{ endMs: number; outstanding: number; blocked: number }> = await this.dataSource.query(
      `WITH ends AS (
         SELECT DISTINCT (x::timestamptz AT TIME ZONE 'UTC') AS "end" FROM unnest($1::text[]) AS x
       ), balances AS (
         SELECT ends."end", l."accountId", sum(l."amount") AS "balance"
           FROM ends
           JOIN "ledger_entry" e ON e."createdAt" < ends."end" AND e."currency" = $2
           JOIN "ledger_line" l ON l."entryId" = e."id"
           JOIN "ledger_account" a ON a."id" = l."accountId" AND a."kind" = 'KASIMAN'
          GROUP BY ends."end", l."accountId"
       )
       SELECT (EXTRACT(EPOCH FROM b."end") * 1000)::float8 AS "endMs",
              COALESCE(-sum(LEAST(b."balance", 0)), 0)::float8 AS "outstanding",
              count(*) FILTER (WHERE p."debtLimit" IS NOT NULL AND -b."balance" > p."debtLimit")::int AS "blocked"
         FROM balances b
         LEFT JOIN "money_policy" p ON p."currency" = $2
        GROUP BY b."end"`,
      [ends, PILOT_CURRENCY],
    );
    const flowOf = new Map(flows.map((f) => [f.week ?? 'total', f]));
    const balanceOf = new Map(balances.map((b) => [Number(b.endMs), b]));
    const result = new Map<string, PilotMoneyDTO>();
    for (const slice of slices) {
      const flow = flowOf.get(slice.key);
      const balance = balanceOf.get(slice.end.getTime());
      const due = flow?.due ?? 0;
      const recovered = flow?.recovered ?? 0;
      result.set(slice.key, {
        commissionDue: due,
        commissionRecovered: recovered,
        recoveryRate: ratio(recovered, due),
        outstandingDebt: balance?.outstanding ?? 0,
        blockedKasimen: balance?.blocked ?? 0,
      });
    }
    return result;
  }
}

function kasimenOf(active: number, isNew: number, retained: number, base: number): PilotKasimenDTO {
  return { active, new: isNew, retained, retentionBase: base, retentionRate: ratio(retained, base) };
}

const FAMILY_LABEL: Record<PilotFamily, string> = {
  all: 'tous',
  people: 'personnes',
  parcels: 'colis',
};

/** Une ligne du CSV (en-tetes en francais, taux entre 0 et 1, vide = sans objet). */
export function csvRow(week: PilotWeekDTO, family: PilotFamily, ind: PilotIndicatorsDTO) {
  const v = (x: number | null | undefined): number | string => (x == null ? '' : x);
  const money = ind.money;
  return {
    semaine: week.weekStart == null ? 'periode' : dayKey(week.weekStart),
    debut: week.start.toISOString(),
    fin: week.end.toISOString(),
    famille: FAMILY_LABEL[family],
    commandees: ind.orders.ordered,
    terminees: ind.orders.completed,
    projection_mensuelle: v(ind.orders.monthlyProjection),
    annulees_client_avant_attribution: ind.orders.riderCanceledBeforeAssignment,
    annulees_client_apres_attribution: ind.orders.riderCanceledAfterAssignment,
    annulees_kasiman: ind.orders.driverCanceled,
    annulees_operateur: ind.orders.operatorCanceled,
    expirees_sans_kasiman: ind.orders.expired,
    delai_attribution_median_s: v(ind.assignment.medianSeconds),
    delai_attribution_p90_s: v(ind.assignment.p90Seconds),
    attribuees_immediates: ind.assignment.assigned,
    taux_service: v(ind.service.rate),
    offres_acceptees: ind.offers.accepted,
    offres_refusees: ind.offers.rejected,
    offres_sans_reponse: ind.offers.noAnswer,
    offres_expirees: ind.offers.expired,
    taux_acceptation_offres: v(ind.offers.rate),
    vague_moyenne_attribution: v(ind.offers.averageWave),
    taux_annulation_client_avant: v(ind.cancellations.riderBeforeAssignmentRate),
    taux_annulation_client_apres: v(ind.cancellations.riderAfterAssignmentRate),
    taux_annulation_kasiman: v(ind.cancellations.driverRate),
    motifs_principaux: ind.cancellations.topReasons.map((r) => `${r.title} (${r.count})`).join(' | '),
    commission_especes_due: v(money?.commissionDue),
    commission_especes_recouvree: v(money?.commissionRecovered),
    taux_recouvrement: v(money?.recoveryRate),
    encours_dette_kasimen: v(money?.outstandingDebt),
    kasimen_bloques: v(money?.blockedKasimen),
    kasimen_actifs: ind.kasimen.active,
    kasimen_nouveaux: ind.kasimen.new,
    kasimen_retenus: ind.kasimen.retained,
    kasimen_actifs_semaine_precedente: ind.kasimen.retentionBase,
    taux_retention_kasimen: v(ind.kasimen.retentionRate),
    clients_actifs: ind.clients.active,
    clients_recurrents: ind.clients.recurring,
    clients_nouveaux: ind.clients.new,
    part_clients_recurrents: v(ind.clients.recurringRate),
    demandes_non_servies: ind.unserved.demands,
    alertes_demande_non_servie: ind.unserved.alerts,
    avis: ind.satisfaction.reviews,
    note_moyenne_etoiles: v(ind.satisfaction.averageStars),
    part_notes_3_ou_moins: v(ind.satisfaction.lowRatingShare),
  };
}
