/**
 * Harnais des tests d'integration du backend (docs/tests-integration.md).
 *
 * Construit les VRAIS services (driver-api, rider-api, admin-api, lib partagee)
 * sur une vraie base PostgreSQL (`kasi_test`, migrations appliquees par
 * global-setup.ts) et un vrai Redis (base logique dediee, 15 par defaut).
 *
 * Doubles, et pourquoi :
 * - Diffusion GraphQL (RedisPubSub) : enregistreur. Les canaux pub/sub Redis
 *   sont COMMUNS a toutes les bases logiques : publier sur l'instance locale
 *   atteindrait les API de la stack Docker et les apps connectees.
 * - Notifications push (Firebase) : espions qui comptent les envois.
 * - Calcul d'itineraire (OSRM/Mapbox via map_setting) : duree fixe, pas de reseau.
 * - Passerelle de paiement (HTTP) : repond en erreur ; le code doit la tolerer.
 * - Appels masques : sans effet.
 * Rien d'autre n'est simule : transactions, verrous et contraintes sont ceux
 * de PostgreSQL.
 */
import 'reflect-metadata';
import Redis from 'ioredis';
import { throwError } from 'rxjs';
import { DataSource } from 'typeorm';

import { TEST_REDIS_DB } from './env';
import { allEntities } from '../../libs/database/src/lib/migration/all-entities';
import { kasiConnectionOptions } from '../../libs/database/src/lib/migration/connection-options';
import { OrderStatus } from '../../libs/database/src/lib/entities/enums/order-status.enum';
import { DriverStatus } from '../../libs/database/src/lib/entities/enums/driver-status.enum';
import { RequestEntity } from '../../libs/database/src/lib/entities/request.entity';
import { RequestActivityEntity } from '../../libs/database/src/lib/entities/request-activity.entity';
import { DriverEntity } from '../../libs/database/src/lib/entities/driver.entity';
import { DriverWalletEntity } from '../../libs/database/src/lib/entities/driver-wallet.entity';
import { DriverTransactionEntity } from '../../libs/database/src/lib/entities/driver-transaction.entity';
import { RiderEntity } from '../../libs/database/src/lib/entities/rider-entity';
import { RiderWalletEntity } from '../../libs/database/src/lib/entities/rider-wallet.entity';
import { RiderTransactionEntity } from '../../libs/database/src/lib/entities/rider-transaction.entity';
import { FleetEntity } from '../../libs/database/src/lib/entities/fleet.entity';
import { FleetWalletEntity } from '../../libs/database/src/lib/entities/fleet-wallet.entity';
import { FleetTransactionEntity } from '../../libs/database/src/lib/entities/fleet-transaction.entity';
import { ProviderWalletEntity } from '../../libs/database/src/lib/entities/provider-wallet.entity';
import { ProviderTransactionEntity } from '../../libs/database/src/lib/entities/provider-transaction.entity';
import { PaymentEntity } from '../../libs/database/src/lib/entities/payment.entity';
import { ServiceCategoryEntity } from '../../libs/database/src/lib/entities/service-category.entity';
import { ServiceOptionEntity } from '../../libs/database/src/lib/entities/service-option.entity';
import { ZonePriceEntity } from '../../libs/database/src/lib/entities/zone-price.entity';
import { FeedbackEntity } from '../../libs/database/src/lib/entities/feedback.entity';
import { MediaEntity } from '../../libs/database/src/lib/entities/media.entity';
import { PayoutEntity } from '../../libs/database/src/lib/entities/payout.entity';
import { PayoutSessionEntity } from '../../libs/database/src/lib/entities/payout-session.entity';
import { CouponEntity } from '../../libs/database/src/lib/entities/coupon.entity';
import { GiftCardEntity } from '../../libs/database/src/lib/entities/gift-card.entity';
import { OperatorEntity } from '../../libs/database/src/lib/entities/operator.entity';
import { CommonCouponService } from '../../libs/database/src/lib/coupon/common-coupon.service';
import { SharedDriverService } from '../../libs/database/src/lib/order/shared-driver.service';
import { SharedRiderService } from '../../libs/database/src/lib/order/shared-rider.service';
import { SharedFleetService } from '../../libs/database/src/lib/order/shared-fleet.service';
import { SharedProviderService } from '../../libs/database/src/lib/order/shared-provider.service';
import { SharedOrderService } from '../../libs/database/src/lib/order/shared-order.service';
import { OrderRedisService } from '../../libs/database/src/lib/redis/order-redis.service';
import { DriverRedisService } from '../../libs/database/src/lib/redis/driver-redis.service';
import { DriverOrderQueryService } from '../../apps/driver-api/src/app/order/driver-order.query-service';
import { OrderService as DriverApiOrderService } from '../../apps/driver-api/src/app/order/order.service';
import { DriverAPIController } from '../../apps/driver-api/src/app/driver-api.controller';
import { RiderOrderService } from '../../apps/rider-api/src/app/order/rider-order.service';
import { RiderOrderQueryService } from '../../apps/rider-api/src/app/order/rider-order.query-service';
import { RiderAPIController } from '../../apps/rider-api/src/app/rider-api.controller';
import { OrderService as AdminOrderService } from '../../apps/admin-api/src/app/order/order.service';
import { RiderResolver as AdminRiderResolver } from '../../apps/admin-api/src/app/rider/rider.resolver';
import { DriverResolver as AdminDriverResolver } from '../../apps/admin-api/src/app/driver/driver.resolver';
import { PayoutService } from '../../apps/admin-api/src/app/payout/payout.service';
import { FleetResolver as AdminFleetResolver } from '../../apps/admin-api/src/app/fleet/fleet.resolver';
import { CouponService as RiderCouponService } from '../../apps/rider-api/src/app/coupon/coupon.service';
import { LedgerResolver } from '../../apps/admin-api/src/app/ledger/ledger.resolver';
import {
  ledgerIntegrityReport,
  LedgerIntegrityReport,
} from '../../libs/database/src/lib/order/ledger-integrity';

export { OrderStatus, DriverStatus };

export const CURRENCY = 'XOF';

// ---------------------------------------------------------------------------
// Connexions
// ---------------------------------------------------------------------------

export async function openDataSource(): Promise<DataSource> {
  const options = kasiConnectionOptions();
  if (!options.database.includes('test')) {
    throw new Error(`[integration] REFUS : base ${options.database}`);
  }
  const ds = new DataSource({
    ...options,
    entities: allEntities,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    // Meme reglage que les API (database.module.ts).
    invalidWhereValuesBehavior: { undefined: 'ignore' },
  });
  return ds.initialize();
}

export function openRedis(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    db: TEST_REDIS_DB,
    lazyConnect: false,
  });
}

/**
 * Vide toutes les tables de la base de test (jamais la table migrations).
 * p2-argent I2 : y compris ledger_account, ledger_entry et ledger_line. Les
 * declencheurs d'immuabilite du grand livre sont des declencheurs de LIGNE
 * (UPDATE, DELETE) : TRUNCATE ne les declenche pas.
 */
export async function resetDatabase(ds: DataSource, redis?: Redis): Promise<void> {
  const [{ db }] = await ds.query('SELECT current_database() AS db');
  if (!String(db).includes('test')) {
    throw new Error(`[integration] REFUS de vider la base ${db}`);
  }
  const tables: Array<{ tablename: string }> = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'
       AND tablename NOT IN ('migrations', 'spatial_ref_sys')`,
  );
  await ds.query(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  if (redis != null) {
    if ((redis.options.db ?? 0) === 0) {
      throw new Error('[integration] REFUS de vider la base Redis 0');
    }
    await redis.flushdb();
  }
}

// ---------------------------------------------------------------------------
// Doubles
// ---------------------------------------------------------------------------

export class RecordingPubSub {
  readonly events: Array<{ trigger: string; payload: unknown }> = [];
  async publish(trigger: string, payload: unknown): Promise<void> {
    this.events.push({ trigger, payload });
  }
  count(trigger: string): number {
    return this.events.filter((e) => e.trigger === trigger).length;
  }
}

export type Spy = Record<string, (...args: unknown[]) => unknown> & {
  calls: string[];
  count(name: string): number;
};

function makeSpy(methods: string[]): Spy {
  const spy = {
    calls: [] as string[],
    count(name: string) {
      return spy.calls.filter((c) => c === name).length;
    },
  } as Spy;
  for (const method of methods) {
    spy[method] = async () => {
      spy.calls.push(method);
    };
  }
  return spy;
}

export function spyRiderNotifications(): Spy {
  return makeSpy([
    'message',
    'canceled',
    'accepted',
    'bookingAssigned',
    'arrived',
    'started',
    'waitingForPostPay',
    'finished',
  ]);
}

export function spyDriverNotifications(): Spy {
  return makeSpy([
    'requests',
    'canceled',
    'message',
    'paid',
    'assigned',
    'upcomingBooking',
  ]);
}

export const routingStub = {
  getSumDistanceAndDuration: async () => ({
    distance: 1200,
    duration: 180,
    directions: [],
  }),
};

export class GatewayStub {
  readonly urls: string[] = [];
  get(url: string) {
    this.urls.push(url);
    return throwError(() => new Error('passerelle absente en test'));
  }
}

export const callMaskingStub = { endSession: async () => undefined };

// ---------------------------------------------------------------------------
// Donnees minimales
// ---------------------------------------------------------------------------

export interface World {
  serviceId: number;
  riderId: number;
  driverIds: number[];
  fleetId: number;
  gatewayId: number;
}

export interface WorldOptions {
  drivers?: number;
  cancellationTotalFee?: number;
  cancellationDriverShare?: number;
  providerSharePercent?: number;
  providerShareFlat?: number;
  /** Rattache le premier Kasiman a une flotte (part de commission de 10 %). */
  firstDriverInFleet?: boolean;
  /** p2-argent I1 : mode de paiement du service (CashCredit par defaut). */
  paymentMethod?: 'CashCredit' | 'OnlyCredit' | 'OnlyCash';
  /** p2-argent I1 : prix d'une minute d'attente (0 par defaut). */
  perMinuteWait?: number;
}

async function insertId(ds: DataSource, sql: string, params: unknown[] = []) {
  const rows: Array<{ id: number }> = await ds.query(sql, params);
  return rows[0].id;
}

export async function createWorld(
  ds: DataSource,
  options: WorldOptions = {},
): Promise<World> {
  const mediaId = await insertId(
    ds,
    `INSERT INTO media (address) VALUES ('integration.png') RETURNING id`,
  );
  const categoryId = await insertId(
    ds,
    `INSERT INTO service_category (title) VALUES ('Integration') RETURNING id`,
  );
  const serviceId = await insertId(
    ds,
    `INSERT INTO service ("categoryId", title, "mediaId", "cancellationTotalFee",
       "cancellationDriverShare", "providerSharePercent", "providerShareFlat",
       "paymentMethod", "perMinuteWait")
     VALUES ($1, 'Course test', $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      categoryId,
      mediaId,
      options.cancellationTotalFee ?? 0,
      options.cancellationDriverShare ?? 0,
      options.providerSharePercent ?? 10,
      options.providerShareFlat ?? 0,
      options.paymentMethod ?? 'CashCredit',
      options.perMinuteWait ?? 0,
    ],
  );
  const fleetId = await insertId(
    ds,
    `INSERT INTO fleet (name, "phoneNumber", "accountNumber", "mobileNumber",
       "commissionSharePercent", "commissionShareFlat")
     VALUES ('Flotte test', 221330000000, 'ACC-1', 221770000000, 10, 0) RETURNING id`,
  );
  const riderId = await insertId(
    ds,
    `INSERT INTO rider ("mobileNumber", "firstName") VALUES (221770000001, 'Client') RETURNING id`,
  );
  const gatewayId = await insertId(
    ds,
    `INSERT INTO payment_gateway (title, type, "privateKey") VALUES ('Passerelle test', 'stripe', 'test') RETURNING id`,
  );
  const driverIds: number[] = [];
  for (let i = 0; i < (options.drivers ?? 2); i++) {
    driverIds.push(
      await insertId(
        ds,
        `INSERT INTO driver ("mobileNumber", "firstName", status, "fleetId")
         VALUES ($1, $2, 'online', $3) RETURNING id`,
        [
          221780000000 + i,
          `Kasiman ${i + 1}`,
          i === 0 && options.firstDriverInFleet ? fleetId : null,
        ],
      ),
    );
  }
  return { serviceId, riderId, driverIds, fleetId, gatewayId };
}

export interface OrderOptions {
  status?: OrderStatus;
  driverId?: number | null;
  cost?: number;
  tipAmount?: number;
}

export async function createOrder(
  ds: DataSource,
  world: World,
  options: OrderOptions = {},
): Promise<number> {
  const cost = options.cost ?? 2000;
  return insertId(
    ds,
    `INSERT INTO request ("expectedTimestamp", "costBest", "costAfterCoupon", "tipAmount",
       addresses, points, "riderId", currency, "serviceId", status, "driverId")
     VALUES (now(), $1, $1, $2, 'Plateau,Almadies',
       ST_GeomFromText('MULTIPOINT((-17.4467 14.6928),(-17.5065 14.7392))', 4326),
       $3, $4, $5, $6, $7) RETURNING id`,
    [
      cost,
      options.tipAmount ?? 0,
      world.riderId,
      CURRENCY,
      world.serviceId,
      options.status ?? OrderStatus.Requested,
      options.driverId ?? null,
    ],
  );
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

export async function orderRow(ds: DataSource, orderId: number) {
  return ds.getRepository(RequestEntity).findOneByOrFail({ id: orderId });
}

export async function activityCount(
  ds: DataSource,
  orderId: number,
  type?: string,
): Promise<number> {
  return ds.getRepository(RequestActivityEntity).count({
    where: type == null ? { requestId: orderId } : ({ requestId: orderId, type } as never),
  });
}

export async function driverStatus(ds: DataSource, driverId: number) {
  return (await ds.getRepository(DriverEntity).findOneByOrFail({ id: driverId }))
    .status;
}

export async function walletBalance(
  ds: DataSource,
  table: 'rider_wallet' | 'driver_wallet' | 'fleet_wallet' | 'admin_wallet',
  owner: Record<string, number>,
): Promise<number | null> {
  const conditions = Object.keys(owner).map((k, i) => `"${k}" = $${i + 2}`);
  const rows: Array<{ amount: number }> = await ds.query(
    `SELECT amount FROM ${table} WHERE currency = $1 ${conditions.map((c) => `AND ${c}`).join(' ')}`,
    [CURRENCY, ...Object.values(owner)],
  );
  if (rows.length > 1) {
    throw new Error(`${rows.length} portefeuilles pour ${table} ${JSON.stringify(owner)}`);
  }
  return rows.length === 0 ? null : Number(rows[0].amount);
}

export async function countRows(
  ds: DataSource,
  table: string,
  where = 'TRUE',
  params: unknown[] = [],
): Promise<number> {
  const [{ n }] = await ds.query(
    `SELECT count(*)::int AS n FROM ${table} WHERE ${where}`,
    params,
  );
  return n;
}

// ---------------------------------------------------------------------------
// p2-argent I2 (2026-10-19) : lectures du grand livre
// ---------------------------------------------------------------------------

/** Solde d'un compte du grand livre (somme de ses lignes), 0 s'il n'existe pas. */
export async function ledgerBalance(ds: DataSource, code: string): Promise<number> {
  const [{ total }] = await ds.query(
    `SELECT COALESCE(SUM(l.amount), 0)::text AS total
       FROM ledger_line l JOIN ledger_account a ON a.id = l."accountId"
      WHERE a.code = $1 AND a.currency = $2`,
    [code, CURRENCY],
  );
  return Number(total);
}

/** Ecritures du grand livre (filtre SQL facultatif sur ledger_entry). */
export async function ledgerEntries(
  ds: DataSource,
  where = 'TRUE',
  params: unknown[] = [],
): Promise<Array<{ id: number; idempotencyKey: string; nature: string; motif: string | null }>> {
  return ds.query(
    `SELECT id, "idempotencyKey", nature, motif FROM ledger_entry WHERE ${where} ORDER BY id`,
    params,
  );
}

/** Controle d'integrite (meme fonction que ledgerIntegrityReport d'admin-api). */
export async function integrity(ds: DataSource): Promise<LedgerIntegrityReport> {
  return ledgerIntegrityReport(ds.manager);
}

/**
 * p2-argent I1 : operateur du back-office avec un role portant ces permissions
 * (aucune : role vide).
 */
export async function createOperator(
  ds: DataSource,
  permissions: string[],
  userName = `operateur-${Math.random().toString(36).slice(2, 8)}`,
): Promise<number> {
  const roleId = await insertId(
    ds,
    `INSERT INTO operator_role (title, permissions)
     VALUES ('Role test', $1::operator_role_permissions_enum[]) RETURNING id`,
    [permissions],
  );
  return insertId(
    ds,
    `INSERT INTO operator ("userName", "roleId") VALUES ($1, $2) RETURNING id`,
    [userName, roleId],
  );
}

export interface CouponOptions {
  code?: string;
  discountPercent?: number;
  discountFlat?: number;
  minimumCost?: number;
  maximumCost?: number;
  isFirstTravelOnly?: boolean;
  /** Decalage du debut de validite, en jours (negatif : deja commence). */
  startsInDays?: number;
  /** Services autorises (vide : tous). */
  serviceIds?: number[];
}

/** p2-argent I1 : coupon valide (commence hier, expire dans 30 jours). */
export async function createCoupon(
  ds: DataSource,
  options: CouponOptions = {},
): Promise<number> {
  const id = await insertId(
    ds,
    `INSERT INTO coupon (code, title, "startTimestamp", "expirationTimestamp",
       "discountPercent", "discountFlat", "minimumCost", "maximumCost",
       "isFirstTravelOnly", "manyUsersCanUse", "manyTimesUserCanUse")
     VALUES ($1, 'Coupon test', now() + ($2 || ' days')::interval,
       now() + interval '30 days', $3, $4, $5, $6, $7, 1000, 10) RETURNING id`,
    [
      options.code ?? 'PROMO10',
      String(options.startsInDays ?? -1),
      options.discountPercent ?? 0,
      options.discountFlat ?? 0,
      options.minimumCost ?? 0,
      options.maximumCost ?? 0,
      options.isFirstTravelOnly ?? false,
    ],
  );
  for (const serviceId of options.serviceIds ?? []) {
    await ds.query(
      `INSERT INTO coupon_services_service ("couponId", "serviceId") VALUES ($1, $2)`,
      [id, serviceId],
    );
  }
  return id;
}

export interface GiftCardOptions {
  code?: string;
  amount?: number;
  isUsed?: boolean;
  /** Debut de validite, en jours par rapport a maintenant (defaut -1). */
  availableInDays?: number;
  /** Expiration, en jours par rapport a maintenant (defaut 30). */
  expiresInDays?: number;
}

/** p2-argent I1 : carte cadeau (disponible depuis hier, expire dans 30 jours). */
export async function createGiftCard(
  ds: DataSource,
  options: GiftCardOptions = {},
): Promise<number> {
  return insertId(
    ds,
    `INSERT INTO gift_card (code, currency, amount, "isUsed", "availableTimestamp",
       "expirationTimestamp")
     VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval,
       now() + ($6 || ' days')::interval) RETURNING id`,
    [
      options.code ?? 'KDO-5000',
      CURRENCY,
      options.amount ?? 5000,
      options.isUsed ?? false,
      String(options.availableInDays ?? -1),
      String(options.expiresInDays ?? 30),
    ],
  );
}

/** Message de l'erreur levee par une promesse (ou null si elle a reussi). */
export async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

// ---------------------------------------------------------------------------
// Fabrique des services reels
// ---------------------------------------------------------------------------

export interface Doubles {
  pubSub: RecordingPubSub;
  riderNotifications: Spy;
  driverNotifications: Spy;
  gateway: GatewayStub;
}

export function makeDoubles(): Doubles {
  return {
    pubSub: new RecordingPubSub(),
    riderNotifications: spyRiderNotifications(),
    driverNotifications: spyDriverNotifications(),
    gateway: new GatewayStub(),
  };
}

export function buildShared(ds: DataSource, redis: Redis, d: Doubles) {
  const repo = <T>(entity: new () => T) => ds.getRepository(entity as never) as never;
  const sharedDriver = new SharedDriverService(
    repo(DriverEntity),
    repo(DriverWalletEntity),
    repo(DriverTransactionEntity),
  );
  const sharedRider = new SharedRiderService(
    repo(RiderEntity),
    repo(RiderWalletEntity),
    repo(RiderTransactionEntity),
  );
  const sharedFleet = new SharedFleetService(
    repo(FleetEntity),
    repo(FleetWalletEntity),
    repo(FleetTransactionEntity),
  );
  const sharedProvider = new SharedProviderService(
    repo(ProviderWalletEntity),
    repo(ProviderTransactionEntity),
  );
  const orderRedis = new OrderRedisService(redis, sharedDriver);
  const driverRedis = new DriverRedisService(redis);
  const unused = {} as never; // dependances non sollicitees par les chemins testes
  // p2-argent I1 : vraies regles du coupon (avant : dependance non sollicitee).
  const commonCoupon = new CommonCouponService(
    repo(CouponEntity),
    repo(RequestEntity),
  );
  const sharedOrder = new SharedOrderService(
    repo(RequestEntity),
    repo(RequestActivityEntity),
    unused, // RegionService (calcul de prix, hors perimetre)
    repo(ServiceCategoryEntity),
    repo(ServiceOptionEntity),
    repo(ZonePriceEntity),
    repo(PaymentEntity),
    unused, // GoogleServicesService
    routingStub as never,
    unused, // ServiceService
    sharedRider,
    driverRedis,
    orderRedis,
    sharedDriver,
    sharedProvider,
    sharedFleet,
    commonCoupon,
    d.pubSub as never,
    d.driverNotifications as never,
    d.riderNotifications as never,
    d.gateway as never,
  );
  return {
    sharedDriver,
    sharedRider,
    sharedFleet,
    sharedProvider,
    sharedOrder,
    orderRedis,
    driverRedis,
    commonCoupon,
  };
}

/** driver-api : updateOneOrder tel que l'appelle le Kasiman `driverId`. */
export function buildDriverApi(
  ds: DataSource,
  redis: Redis,
  d: Doubles,
  driverId: number,
) {
  const shared = buildShared(ds, redis, d);
  const orderService = new DriverApiOrderService(
    ds.getRepository(RequestEntity),
    ds.getRepository(RequestActivityEntity),
    ds.getRepository(PaymentEntity),
    shared.sharedDriver,
    shared.orderRedis,
    shared.sharedFleet,
    d.pubSub as never,
    d.gateway as never,
    callMaskingStub as never,
  );
  const queryService = new DriverOrderQueryService(
    ds.getRepository(RequestEntity),
    ds.getRepository(RequestActivityEntity),
    shared.sharedDriver,
    orderService,
    shared.orderRedis,
    shared.driverRedis,
    routingStub as never,
    shared.sharedOrder,
    d.pubSub as never,
    { req: { user: { id: driverId } } } as never,
    d.riderNotifications as never,
  );
  const controller = new DriverAPIController(
    ds.getRepository(MediaEntity),
    ds.getRepository(DriverEntity),
    ds.getRepository(PaymentEntity),
    { decrypt: async (token: string) => JSON.parse(token) } as never,
    shared.sharedDriver,
  );
  return {
    ...shared,
    orderService,
    controller,
    /** Equivalent de la mutation `updateOneOrder(input: { id, update })`. */
    update: (orderId: number, update: Record<string, unknown>) =>
      queryService.updateOne(orderId, update as never),
  };
}

/** rider-api : annulation, avis, retour de passerelle. */
export function buildRiderApi(ds: DataSource, redis: Redis, d: Doubles) {
  const shared = buildShared(ds, redis, d);
  const riderOrderService = new RiderOrderService(
    ds.getRepository(RequestEntity),
    ds.getRepository(RequestActivityEntity),
    ds.getRepository(FeedbackEntity),
    ds.getRepository(PaymentEntity),
    shared.sharedRider,
    shared.sharedDriver,
    shared.orderRedis,
    shared.sharedProvider,
    d.driverNotifications as never,
    d.pubSub as never,
    d.gateway as never,
    callMaskingStub as never,
  );
  const queryService = new RiderOrderQueryService(
    ds.getRepository(RequestEntity),
    riderOrderService,
    shared.commonCoupon,
    d.pubSub as never,
  );
  const couponService = new RiderCouponService(
    ds.getRepository(GiftCardEntity),
    shared.sharedRider,
  );
  const controller = new RiderAPIController(
    shared.sharedRider,
    shared.sharedOrder,
    riderOrderService,
    { decrypt: async (token: string) => JSON.parse(token) } as never,
    d.pubSub as never,
    ds.getRepository(RiderEntity),
    ds.getRepository(PaymentEntity),
    ds.getRepository(MediaEntity),
    callMaskingStub as never,
  );
  return {
    ...shared,
    riderOrderService,
    controller,
    /** Equivalent de la mutation `redeemGiftCard(code)` du client `riderId`. */
    redeemGiftCard: (code: string, riderId: number) =>
      couponService.redeemGiftCard(code, riderId),
    /** Equivalent de `updateOneOrder` de rider-api pour le client `riderId`. */
    update: (orderId: number, riderId: number, update: Record<string, unknown>) =>
      queryService.updateOne(orderId, update as never, {
        filter: { riderId: { eq: riderId } },
      } as never),
  };
}

/** admin-api : operations manuelles, annulation operateur, versements. */
export function buildAdminApi(
  ds: DataSource,
  redis: Redis,
  d: Doubles,
  operatorId: number,
) {
  const shared = buildShared(ds, redis, d);
  const context = { req: { user: { id: operatorId } } } as never;
  return {
    ...shared,
    riderResolver: new AdminRiderResolver(shared.sharedRider, context, ds),
    driverResolver: new AdminDriverResolver(
      {} as never,
      shared.sharedDriver,
      ds.getRepository(OperatorEntity),
      context,
    ),
    fleetResolver: new AdminFleetResolver(shared.sharedFleet, context, ds),
    // p2-argent I2 : requete ledgerIntegrityReport.
    ledgerResolver: new LedgerResolver(ds, context),
    orderService: new AdminOrderService(
      ds.getRepository(RequestEntity),
      ds.getRepository(RequestActivityEntity),
      shared.orderRedis,
      d.pubSub as never,
    ),
    payoutService: new PayoutService(
      ds.getRepository(PayoutSessionEntity),
      ds.getRepository(PayoutEntity),
      ds.getRepository(DriverEntity),
      ds.getRepository(DriverWalletEntity),
      ds.getRepository(DriverTransactionEntity),
    ),
  };
}

/** Reponse Fastify minimale pour appeler les controleurs REST. */
export function fakeReply() {
  const reply = {
    redirected: 0,
    sent: 0,
    redirect() {
      reply.redirected++;
      return reply;
    },
    send() {
      reply.sent++;
      return reply;
    },
    code() {
      return reply;
    },
    header() {
      return reply;
    },
  };
  return reply;
}

/** Lance `fn` n fois en meme temps et renvoie les resultats (succes et erreurs). */
export async function concurrently<T>(
  n: number,
  fn: (i: number) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(Array.from({ length: n }, (_, i) => fn(i)));
}
