import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ForbiddenError } from '@nestjs/apollo';
import { createHash, randomUUID } from 'crypto';
import { EntityManager, In, Repository } from 'typeorm';

import { CommonCouponService } from '../coupon/common-coupon.service';
import { CouponEntity } from '../entities/coupon.entity';
import { ServiceOptionType } from '../entities/enums/service-option-type.enum';
import {
  FareQuoteEntity,
  FareQuoteKind,
  FareQuoteOrigin,
  FareQuoteRoutingSource,
} from '../entities/fare-quote.entity';
import { ServiceCategoryEntity } from '../entities/service-category.entity';
import { ServiceOptionEntity } from '../entities/service-option.entity';
import { ServiceEntity } from '../entities/service.entity';
import { ZonePriceEntity } from '../entities/zone-price.entity';
import { Point } from '../interfaces/point';
import { roundFcfa } from './ledger';
import { RegionService } from './region/region.service';
import { isRealRoute, RouteMetrics, RoutingService } from './routing/routing.service';
import { ServiceService } from './service.service';
import { SharedFleetService } from './shared-fleet.service';
import { SharedRiderService } from './shared-rider.service';

/**
 * p2-argent I4 (2026-10-20) : devis fige (docs/fiche-conception-argent.md §5,
 * `bug-prix`). UN SEUL calcul de prix, fait une fois, conserve dans
 * `fare_quote`, puis consomme par une seule commande.
 *
 * Remplace les deux calculs d'avant (SharedOrderService.calculateFare et
 * createOrder), qui divergeaient (fiche §2.2) :
 * - C2 : options payantes comptees a l'apercu comme a la commande ;
 * - C3 : forfait de zone retenu = le premier qui couvre CE service, avec SES
 *   multiplicateurs horaires ; options ajoutees au forfait ; arrondi apres
 *   forfait, multiplicateurs et options ;
 * - C4 : la commande reprend la distance et la duree du devis (pas de second
 *   itineraire pour le prix) ;
 * - C5 : une seule heure, celle de la prise en charge (`pickupAt`) ;
 * - C6 : client (statut de resident) et coupon pris en compte partout ;
 * - C1 (app installee qui n'envoie pas le coupon) : appariement du devis,
 *   coupon compris (`findForInstalledApp`).
 *
 * Refus sans itineraire reel (fiche §5.4, decision §8.10) : estimation a vol
 * d'oiseau = pas de devis si le prix depend de la distance ou de la duree.
 * Exception : le forfait de zone (routingSource `zone`). OSRM est un vrai
 * calcul routier, accepte.
 *
 * Validite (decision §8.7) : 2 minutes pour une app qui envoie `quoteId`
 * (FARE_QUOTE_TTL_SECONDS) ; 10 minutes pour l'appariement d'une app
 * installee sans `quoteId`.
 */

export const FARE_QUOTE_TTL_SECONDS = 120;
export const FARE_QUOTE_INSTALLED_APP_SECONDS = 600;
/** Purge des devis non consommes plus vieux que cela (fiche §5.2). */
export const FARE_QUOTE_PURGE_AFTER_HOURS = 24;
/** Ecart tolere entre la prise en charge du devis et celle de la commande. */
export const FARE_QUOTE_PICKUP_TOLERANCE_MINUTES = 10;

export function fareQuoteTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env['FARE_QUOTE_TTL_SECONDS']);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : FARE_QUOTE_TTL_SECONDS;
}

/** Refus lisibles (rider-app affiche le message) et code stable en extension. */
export const FareQuoteRefusal = {
  RouteUnavailable: {
    code: 'ROUTE_UNAVAILABLE',
    message: "Impossible de calculer l'itinéraire pour le moment. Réessayez dans un instant.",
  },
  Expired: {
    code: 'QUOTE_EXPIRED',
    message: "Le prix a changé, nous l'avons recalculé.",
  },
  Mismatch: {
    code: 'QUOTE_MISMATCH',
    message:
      "Le trajet, le service ou les options ont changé depuis l'affichage du prix. Nous l'avons recalculé.",
  },
  AlreadyUsed: {
    code: 'QUOTE_ALREADY_USED',
    message: 'Cette commande est déjà enregistrée.',
  },
  RegionUnsupported: { code: 'REGION_UNSUPPORTED', message: 'REGION_UNSUPPORTED' },
  NoServiceInRegion: { code: 'NO_SERVICE_IN_REGION', message: 'NO_SERVICE_IN_REGION' },
} as const;

export function fareQuoteError(refusal: { code: string; message: string }): ForbiddenError {
  return new ForbiddenError(refusal.message, { extensions: { code: refusal.code } });
}

/** Points arrondis a 6 decimales (environ 10 cm), dans l'ordre saisi. */
export function hashPoints(points: Point[]): string {
  const canonical = points
    .map((p) => `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`)
    .join(';');
  return createHash('sha256').update(canonical).digest('hex');
}

/** Identifiants d'options normalises (texte, sans doublon, tries). */
export function normalizeOptionIds(ids?: Array<string | number> | null): string[] {
  return [...new Set((ids ?? []).map((id) => String(id)))].sort();
}

export interface FareQuoteInput {
  /** Points saisis par l'app (sans le retour d'un aller-retour). */
  points: Point[];
  optionIds?: Array<string | number> | null;
  coupon?: CouponEntity | null;
  riderId?: number | null;
  /** Heure de prise en charge (maintenant par defaut ; reservation : plus tard). */
  pickupAt?: Date;
  twoWay?: boolean;
}

/** Un service chiffre (apercu) et son devis. */
export interface QuotedService {
  service: ServiceEntity;
  quote: FareQuoteEntity;
}

/** Resultat de l'apercu (getFare, calculateFare). */
export interface FarePreview {
  currency: string;
  distance: number;
  duration: number;
  directions: Point[];
  categories: Array<{ category: ServiceCategoryEntity; services: QuotedService[] }>;
}

interface PricingContext {
  points: Point[];
  currency: string;
  pickupAt: Date;
  isResident: boolean;
  feeMultiplier: number;
  zonePricings: ZonePriceEntity[];
  selectedOptions: ServiceOptionEntity[];
  coupon: CouponEntity | null;
  riderId: number | null;
  twoWay: boolean;
  routes: Map<string, Promise<RouteMetrics>>;
}

/** Un devis calcule, pas encore enregistre, et l'itineraire qui l'a produit. */
export interface ComputedQuote {
  quote: FareQuoteEntity;
  options: ServiceOptionEntity[];
  directions: Point[];
}

@Injectable()
export class FareQuoteService {
  private readonly logger = new Logger('FareQuote');

  constructor(
    @InjectRepository(FareQuoteEntity)
    private quoteRepository: Repository<FareQuoteEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private categoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceEntity)
    private serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(ServiceOptionEntity)
    private optionRepository: Repository<ServiceOptionEntity>,
    @InjectRepository(ZonePriceEntity)
    private zonePriceRepository: Repository<ZonePriceEntity>,
    private regionService: RegionService,
    private routingService: RoutingService,
    private serviceService: ServiceService,
    private riderService: SharedRiderService,
    private fleetService: SharedFleetService,
    private couponService: CommonCouponService,
  ) {}

  // -------------------------------------------------------------------------
  // Apercu
  // -------------------------------------------------------------------------

  /**
   * Apercu de tous les services de la region du point de depart. Un service
   * dont le prix depend de la distance, sans forfait de zone, n'est pas
   * chiffre si l'itineraire n'est qu'une estimation : il est retire de la
   * liste ; si plus aucun service ne reste, refus ROUTE_UNAVAILABLE.
   * `persist` : devis enregistres (rider-api) ; false : apercu du back-office.
   */
  async preview(input: FareQuoteInput, persist: boolean): Promise<FarePreview> {
    const regions = await this.regionService.getRegionWithPoint(input.points[0]);
    if (regions.length < 1) {
      throw fareQuoteError(FareQuoteRefusal.RegionUnsupported);
    }
    const servicesInRegion = await this.regionService.getRegionServices(regions[0].id);
    if (servicesInRegion.length < 1) {
      throw fareQuoteError(FareQuoteRefusal.NoServiceInRegion);
    }
    const regionServiceIds = new Set(servicesInRegion.map((s) => Number(s.id)));
    const ctx = await this.context(input, regions[0].currency);
    const cats = await this.categoryRepository.find({
      relations: { services: { media: true, options: true } },
      order: { id: 'ASC' },
    });
    const categories: FarePreview['categories'] = [];
    let refusedForRoute = 0;
    const toSave: FareQuoteEntity[] = [];
    for (const category of cats) {
      const services: QuotedService[] = [];
      for (const service of category.services ?? []) {
        if (!regionServiceIds.has(Number(service.id))) continue;
        const computed = await this.price(service, ctx, FareQuoteOrigin.Apercu);
        if (computed == null) {
          refusedForRoute++;
          continue;
        }
        services.push({ service, quote: computed.quote });
        toSave.push(computed.quote);
      }
      if (services.length > 0) {
        categories.push({ category, services });
      }
    }
    if (categories.length === 0 && refusedForRoute > 0) {
      throw fareQuoteError(FareQuoteRefusal.RouteUnavailable);
    }
    if (persist && toSave.length > 0) {
      await this.insertQuotes(this.quoteRepository.manager, toSave);
    }
    const base = await this.route(ctx, false, ctx.routes.size > 0);
    return {
      currency: regions[0].currency,
      distance: base.distance,
      duration: base.duration,
      directions: base.directions,
      categories,
    };
  }

  // -------------------------------------------------------------------------
  // Commande
  // -------------------------------------------------------------------------

  /**
   * Devis d'un service, calcule a la commande (aucun devis retrouve, ou
   * back-office). Non enregistre : la commande l'insere dans sa transaction.
   * Refus ROUTE_UNAVAILABLE sans itineraire reel (hors forfait de zone).
   */
  async computeForOrder(
    serviceId: number,
    input: FareQuoteInput,
    currency: string,
  ): Promise<ComputedQuote> {
    const service = await this.serviceRepository.findOneOrFail({
      where: { id: serviceId },
      relations: { options: true },
    });
    const ctx = await this.context(input, currency);
    const computed = await this.price(service, ctx, FareQuoteOrigin.Commande);
    if (computed == null) {
      throw fareQuoteError(FareQuoteRefusal.RouteUnavailable);
    }
    return computed;
  }

  /** Options du service retenues pour un devis (intersection avec la saisie). */
  async optionsForService(
    serviceId: number,
    optionIds?: Array<string | number> | null,
  ): Promise<ServiceOptionEntity[]> {
    const ids = normalizeOptionIds(optionIds);
    if (ids.length === 0) return [];
    const service = await this.serviceRepository.findOneOrFail({
      where: { id: serviceId },
      relations: { options: true },
    });
    const allowed = new Set((service.options ?? []).map((o) => String(o.id)));
    const kept = ids.filter((id) => allowed.has(id)).map(Number);
    if (kept.length === 0) return [];
    return this.optionRepository.findBy({ id: In(kept) });
  }

  async findById(quoteId: string): Promise<FareQuoteEntity | null> {
    if (!isUuid(quoteId)) return null;
    return this.quoteRepository.findOneBy({ id: quoteId });
  }

  /**
   * App installee (aucun `quoteId`) : dernier devis non consomme du meme
   * client, meme service, memes points (6 decimales), memes options et meme
   * aller-retour, de moins de 10 minutes. Coupon compris (C1) ; si l'app
   * envoie un coupon, seul un devis avec ce coupon convient.
   */
  async findForInstalledApp(input: {
    riderId: number;
    serviceId: number;
    points: Point[];
    optionIds: string[];
    twoWay: boolean;
    couponId?: number | null;
  }): Promise<FareQuoteEntity | null> {
    const qb = this.quoteRepository
      .createQueryBuilder('q')
      .where('q.riderId = :riderId', { riderId: input.riderId })
      .andWhere('q.serviceId = :serviceId', { serviceId: input.serviceId })
      .andWhere('q.pointsHash = :hash', { hash: hashPoints(input.points) })
      .andWhere('q.optionIds = :options', { options: input.optionIds.join(',') })
      .andWhere('q.twoWay = :twoWay', { twoWay: input.twoWay })
      .andWhere('q.kind = :kind', { kind: FareQuoteKind.Initial })
      .andWhere('q.consumedAt IS NULL')
      .andWhere(`q.createdAt > now() - make_interval(secs => ${FARE_QUOTE_INSTALLED_APP_SECONDS})`);
    if (input.couponId != null) {
      qb.andWhere('q.couponId = :couponId', { couponId: input.couponId });
    }
    return qb.orderBy('q.createdAt', 'DESC').getOne();
  }

  /**
   * Consommation atomique (fiche §5.2) : un devis ne sert qu'a une commande.
   * Deux commandes simultanees sur le meme devis : la seconde attend le verrou
   * de ligne, puis ne trouve plus de devis libre (0 ligne) et echoue.
   * `window` : `quote` = jusqu'a `expiresAt` (app qui envoie quoteId) ;
   * `installed-app` = 10 minutes apres sa creation.
   */
  async consume(
    manager: EntityManager,
    quoteId: string,
    requestId: number,
    window: 'quote' | 'installed-app',
  ): Promise<boolean> {
    const validity =
      window === 'quote'
        ? `"expiresAt" > now()`
        : `"createdAt" > now() - make_interval(secs => ${FARE_QUOTE_INSTALLED_APP_SECONDS})`;
    const result: unknown = await manager.query(
      `UPDATE "fare_quote" SET "consumedAt" = now(), "requestId" = $1
        WHERE "id" = $2 AND "consumedAt" IS NULL AND ${validity}
        RETURNING "id"`,
      [requestId, quoteId],
    );
    return affectedRows(result) > 0;
  }

  /**
   * Enregistre des devis. Horodatage par la BASE (`createdAt` = now(),
   * `expiresAt` = now() + duree) : la consommation compare a now() de la
   * base, quel que soit le fuseau ou l'horloge du processus. Les valeurs
   * enregistrees sont recopiees dans les objets (quoteExpiresAt de getFare).
   */
  async insertQuotes(manager: EntityManager, quotes: FareQuoteEntity[]): Promise<void> {
    if (quotes.length === 0) return;
    const ttl = fareQuoteTtlSeconds();
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(FareQuoteEntity)
      .values(
        quotes.map((q) => {
          const { createdAt, expiresAt, ...rest } = q;
          void createdAt;
          void expiresAt;
          return { ...rest, expiresAt: () => `now() + make_interval(secs => ${ttl})` };
        }) as never,
      )
      .returning(['id', 'createdAt', 'expiresAt'])
      .execute();
    const rows = (result.raw ?? []) as Array<{ id: string; createdAt: Date; expiresAt: Date }>;
    for (const row of rows) {
      const quote = quotes.find((q) => q.id === row.id);
      if (quote != null) {
        quote.createdAt = new Date(row.createdAt);
        quote.expiresAt = new Date(row.expiresAt);
      }
    }
  }

  /** Purge quotidienne : devis non consommes de plus de 24 heures. */
  async purgeExpired(manager?: EntityManager): Promise<number> {
    return purgeFareQuotes(manager ?? this.quoteRepository.manager);
  }

  // -------------------------------------------------------------------------
  // Calcul
  // -------------------------------------------------------------------------

  private async context(input: FareQuoteInput, currency: string): Promise<PricingContext> {
    const points = input.points.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
    const zonePricings =
      points.length == 2 ? await this.zonePricingsForPoints(points[0], points[1]) : [];
    let isResident = process.env.MOTAXI == null;
    if (input.riderId != null) {
      const rider = await this.riderService.findById(input.riderId);
      isResident = rider?.isResident ?? process.env.MOTAXI == null;
    }
    // Flotte du point de depart : aucune flotte = multiplicateur 1. Avant, a
    // l'apercu, getFleetById(undefined) lisait la PREMIERE flotte en base.
    const fleetIds = await this.fleetService.getFleetIdsInPoint(points[0]);
    const feeMultiplier =
      fleetIds.length == 0
        ? 1
        : ((await this.fleetService.getFleetById(fleetIds[0]))?.feeMultiplier ?? 1);
    const optionIds = normalizeOptionIds(input.optionIds);
    const selectedOptions =
      optionIds.length == 0
        ? []
        : await this.optionRepository.findBy({ id: In(optionIds.map(Number)) });
    return {
      points,
      currency,
      pickupAt: input.pickupAt ?? new Date(),
      isResident,
      feeMultiplier: Number(feeMultiplier),
      zonePricings,
      selectedOptions,
      coupon: input.coupon ?? null,
      riderId: input.riderId ?? null,
      twoWay: input.twoWay ?? false,
      routes: new Map(),
    };
  }

  /** Itineraire (aller ou aller-retour), un seul appel par trajet et par calcul. */
  private route(ctx: PricingContext, twoWay: boolean, needed: boolean): Promise<RouteMetrics> {
    if (!needed || ctx.points.length < 2) {
      return Promise.resolve({ distance: 0, duration: 0, directions: [], source: 'none' });
    }
    const key = twoWay ? 'two-way' : 'one-way';
    let pending = ctx.routes.get(key);
    if (pending == null) {
      const points = twoWay ? [...ctx.points, ctx.points[0]] : ctx.points;
      pending = this.routingService.getSumDistanceAndDuration(points);
      ctx.routes.set(key, pending);
    }
    return pending;
  }

  /**
   * Prix d'un service (fiche §3.5) : base (forfait de zone, ou formule du
   * service a l'heure de prise en charge), + options payantes, puis arrondi
   * `roundingFactor` et arrondi au franc ; coupon ensuite (remise au franc,
   * jamais sous 0). null : pas de devis faute d'itineraire reel.
   */
  private async price(
    service: ServiceEntity,
    ctx: PricingContext,
    origin: FareQuoteOrigin,
  ): Promise<ComputedQuote | null> {
    const allowed = new Set((service.options ?? []).map((o) => String(o.id)));
    const options = ctx.selectedOptions.filter((o) => allowed.has(String(o.id)));
    const twoWay = ctx.twoWay || options.some((o) => o.type == ServiceOptionType.TwoWay);
    const zone = ctx.zonePricings.find((z) =>
      (z.services ?? []).some((s) => Number(s.id) == Number(service.id)),
    );
    const dependsOnRoute =
      Number(service.perHundredMeters) > 0 || Number(service.perMinuteDrive) > 0;
    const needsRoute = dependsOnRoute || Number(service.maximumDestinationDistance ?? 0) > 0;
    const metrics = await this.route(ctx, twoWay, needsRoute);
    const realRoute = isRealRoute(metrics.source);
    if (zone == null && dependsOnRoute && !realRoute) {
      this.logger.warn(
        `service ${service.id} : pas de devis, itineraire « ${metrics.source} » (estimation)`,
      );
      return null;
    }
    const routingSource =
      zone != null && !realRoute ? FareQuoteRoutingSource.Zone : (metrics.source as FareQuoteRoutingSource);

    const breakdown: Record<string, unknown> = {
      pickupAt: ctx.pickupAt.toISOString(),
      isResident: ctx.isResident,
      feeMultiplier: ctx.feeMultiplier,
      distance: metrics.distance,
      duration: metrics.duration,
      route: metrics.source,
    };
    let base: number;
    if (zone != null) {
      let multiplier = 1;
      for (const m of zone.timeMultipliers ?? []) {
        if (inTimeRange(ctx.pickupAt, m.startTime, m.endTime)) {
          multiplier *= Number(m.multiply);
        }
      }
      base = Number(zone.cost) * multiplier;
      breakdown['zone'] = { id: zone.id, cost: Number(zone.cost), timeMultiplier: multiplier };
    } else {
      base = this.serviceService.calculateCost(
        service,
        metrics.distance,
        metrics.duration,
        ctx.pickupAt,
        ctx.feeMultiplier,
        ctx.isResident,
        false,
      );
      breakdown['service'] = {
        baseFare: Number(service.baseFare),
        perHundredMeters: Number(service.perHundredMeters),
        perMinuteDrive: Number(service.perMinuteDrive),
        minimumFee: Number(service.minimumFee),
        cost: base,
      };
    }
    const paid = options.filter((o) => o.type == ServiceOptionType.Paid);
    const optionFee = paid.reduce((sum, o) => sum + Number(o.additionalFee ?? 0), 0);
    breakdown['options'] = paid.map((o) => ({ id: o.id, fee: Number(o.additionalFee ?? 0) }));
    breakdown['optionFee'] = optionFee;
    let beforeCoupon = base + optionFee;
    breakdown['beforeRounding'] = beforeCoupon;
    const factor = Number(service.roundingFactor ?? 0);
    if (factor > 0) {
      beforeCoupon = Math.round(beforeCoupon / factor) * factor;
      breakdown['roundingFactor'] = factor;
    }
    const totalBeforeCoupon = Math.max(0, roundFcfa(beforeCoupon));
    let total = totalBeforeCoupon;
    let couponId: number | null = null;
    if (
      ctx.coupon != null &&
      this.couponService.refusalForOrder(ctx.coupon, service.id, totalBeforeCoupon) == null
    ) {
      total = this.couponService.applyCouponOnPrice(ctx.coupon, totalBeforeCoupon);
      couponId = ctx.coupon.id;
      breakdown['coupon'] = {
        id: ctx.coupon.id,
        code: ctx.coupon.code,
        discount: totalBeforeCoupon - total,
      };
    }
    const now = new Date();
    const quote = this.quoteRepository.create({
      id: randomUUID(),
      riderId: ctx.riderId,
      serviceId: service.id,
      currency: ctx.currency,
      points: ctx.points,
      pointsHash: hashPoints(ctx.points),
      optionIds: normalizeOptionIds(options.map((o) => o.id)),
      couponId,
      twoWay,
      pickupAt: ctx.pickupAt,
      distance: Math.round(metrics.distance),
      duration: Math.round(metrics.duration),
      routingSource,
      breakdown,
      totalBeforeCoupon,
      total,
      origin,
      createdAt: now,
      expiresAt: new Date(now.getTime() + fareQuoteTtlSeconds() * 1000),
      kind: FareQuoteKind.Initial,
    });
    return { quote, options, directions: metrics.directions };
  }

  private async zonePricingsForPoints(from: Point, to: Point): Promise<ZonePriceEntity[]> {
    const rows: Array<{ id: number }> = await this.zonePriceRepository.query(
      'SELECT id FROM zone_price WHERE ST_Within(ST_SetSRID(ST_MakePoint($1, $2), 4326), "from") AND ST_Within(ST_SetSRID(ST_MakePoint($3, $4), 4326), "to") ORDER BY id',
      [from.lng, from.lat, to.lng, to.lat],
    );
    if (rows.length === 0) return [];
    return this.zonePriceRepository.find({
      where: { id: In(rows.map((r) => r.id)) },
      relations: { services: true, fleets: true },
      order: { id: 'ASC' },
    });
  }
}

/** Purge (appelee aussi par la tache quotidienne d'admin-api). */
export async function purgeFareQuotes(manager: EntityManager): Promise<number> {
  const result: unknown = await manager.query(
    `DELETE FROM "fare_quote"
      WHERE "consumedAt" IS NULL
        AND "createdAt" < now() - make_interval(hours => ${FARE_QUOTE_PURGE_AFTER_HOURS})`,
  );
  return affectedRows(result);
}

/** TypeORM (PostgreSQL) renvoie [lignes, nombre] pour UPDATE et DELETE. */
function affectedRows(result: unknown): number {
  if (Array.isArray(result) && result.length === 2 && typeof result[1] === 'number') {
    return result[1];
  }
  return Array.isArray(result) ? result.length : 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value ?? '');
}

function inTimeRange(at: Date, start: string, end: string): boolean {
  const toMinutes = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
  const now = at.getHours() * 60 + at.getMinutes();
  return now >= toMinutes(start) && now <= toMinutes(end);
}
