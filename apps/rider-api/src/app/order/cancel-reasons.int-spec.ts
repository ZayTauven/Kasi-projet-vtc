/**
 * p3-mesures M4, lot A1 (2026-10-22) : motifs d'annulation cote API
 * (docs/fiche-motifs-annulation.md §2 « API » et §5 « Banc »).
 *
 *   npm run test:integration -- cancel-reasons
 *
 * Les six chemins d'annulation (client avant et apres attribution, a la
 * facture, reservation, Kasiman, operateur) ecrivent le motif avec le statut ;
 * sans motif (apps installees), motif vide ; motif refuse (inconnu, desactive,
 * d'un autre auteur, illisible) : annulation faite, motif vide, avertissement ;
 * rejeu avec un autre motif : le premier reste ; pilotCancelReasons compte le
 * motif sous le bon auteur.
 */
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ID } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';

import {
  buildAdminApi,
  buildDriverApi,
  buildRiderApi,
  concurrently,
  createOperator,
  createOrder,
  createWorld,
  Doubles,
  makeDoubles,
  openDataSource,
  openRedis,
  orderRow,
  OrderStatus,
  resetDatabase,
  World,
} from '../../../../../tools/test-integration/harness';
import { OrderResolver as RiderOrderResolver } from './order.resolver';
import { CancelReasonResolver as RiderCancelReasonResolver } from './cancel-reason.resolver';
import { UpdateOrderInput as RiderUpdateOrderInput } from './dto/update-order.input';
import { CancelReasonResolver as DriverCancelReasonResolver } from '../../../../driver-api/src/app/order/cancel-reason.resolver';
import { UpdateOrderInput as DriverUpdateOrderInput } from '../../../../driver-api/src/app/order/dto/update-order.input';
import { DispatcherResolver } from '../../../../admin-api/src/app/order/dispatcher.resolver';
import { PilotInsightsResolver } from '../../../../admin-api/src/app/pilot-insights/pilot-insights.resolver';
import { PilotInsightsService } from '../../../../admin-api/src/app/pilot-insights/pilot-insights.service';
import { CancelReasonDTO } from '../../../../../libs/database/src/lib/order/dto/cancel-reason.dto';

type Author = 'Rider' | 'Driver' | 'Operator';

interface FieldMeta {
  name: string;
  type: unknown;
  nullable: boolean;
}

/**
 * Metadonnees GraphQL compilees (decorateurs @Field, @Query, @Mutation,
 * @Args) des classes donnees : ce que le schema publie.
 */
function compiledMetadata(targets: Function[]) {
  LazyMetadataStorage.load(targets as never);
  TypeMetadataStorage.compile();
  const argsOf = (item: { methodArgs?: Array<{ index: number; typeFn?: () => unknown; options?: { nullable?: unknown } }> }) =>
    [...(item.methodArgs ?? [])]
      .sort((a, b) => a.index - b.index)
      .map((a) => ({
        name: (a as { name?: string }).name,
        type: a.typeFn?.(),
        nullable: Boolean(a.options?.nullable),
      }));
  const handler = (
    list: Array<{
      target: Function;
      methodName: string;
      typeFn: () => unknown;
      returnTypeOptions?: { nullable?: unknown; isArray?: boolean };
    }>,
    target: Function,
    methodName: string,
  ) => {
    const item = list.find((m) => m.target === target && m.methodName === methodName);
    if (item == null) throw new Error(`${target.name}.${methodName} : aucune metadonnee GraphQL`);
    // typeFn d'abord : c'est son appel qui renseigne isArray.
    const type = item.typeFn();
    return {
      list: Boolean(item.returnTypeOptions?.isArray),
      type,
      nullable: Boolean(item.returnTypeOptions?.nullable),
      args: argsOf(item as never),
    };
  };
  return {
    query: (target: Function, methodName: string) =>
      handler(TypeMetadataStorage.getQueriesMetadata() as never, target, methodName),
    mutation: (target: Function, methodName: string) =>
      handler(TypeMetadataStorage.getMutationsMetadata() as never, target, methodName),
    fields: (target: Function, kind: 'object' | 'input'): FieldMeta[] => {
      const types =
        kind === 'object' ? TypeMetadataStorage.getObjectTypesMetadata() : TypeMetadataStorage.getInputTypesMetadata();
      const item = types.find((t) => t.target === target);
      if (item == null) throw new Error(`${target.name} : aucun type GraphQL`);
      return (item.properties ?? []).map((p) => ({
        name: p.name,
        type: p.typeFn(),
        nullable: Boolean(p.options?.nullable),
      }));
    },
  };
}

describe('motifs d annulation (p3-mesures M4, A1)', () => {
  let ds: DataSource;
  let redis: Redis;
  let d: Doubles;
  let world: World;
  let operatorId: number;
  let warn: jest.SpyInstance;
  /** Catalogue du banc : motifs actifs, puis un motif desactive par auteur. */
  let r: {
    rider: number[];
    riderOff: number;
    driver: number[];
    driverOff: number;
    operator: number[];
    operatorOff: number;
  };

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
    operatorId = await createOperator(ds, ['Requests_View']);
    const insert = async (title: string, userType: Author, isEnabled = true) => {
      const [{ id }] = await ds.query(
        `INSERT INTO order_cancel_reason (title, "userType", "isEnabled") VALUES ($1, $2, $3) RETURNING id`,
        [title, userType, isEnabled],
      );
      return Number(id);
    };
    // Ordre d'insertion melange : la liste doit sortir triee par id.
    const riderA = await insert('Attente trop longue', 'Rider');
    const driverA = await insert('Le client ne repond pas', 'Driver');
    const riderOff = await insert('Ancien motif client', 'Rider', false);
    const operatorA = await insert('Commande en double', 'Operator');
    const riderB = await insert('Je me suis trompe d adresse', 'Rider');
    const driverOff = await insert('Ancien motif Kasiman', 'Driver', false);
    const driverB = await insert('Panne du vehicule', 'Driver');
    const operatorB = await insert('Suspicion de fraude', 'Operator');
    const operatorOff = await insert('Ancien motif operateur', 'Operator', false);
    r = {
      rider: [riderA, riderB],
      riderOff,
      driver: [driverA, driverB],
      driverOff,
      operator: [operatorA, operatorB],
      operatorOff,
    };
    warn = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  const rider = () => buildRiderApi(ds, redis, d);
  const driver = (i = 0) => buildDriverApi(ds, redis, d, world.driverIds[i]);
  const admin = () => buildAdminApi(ds, redis, d, operatorId);
  /** Mutations `cancelOrder` / `cancelBooking` de rider-api (vrai resolveur). */
  const riderResolver = () => {
    const api = rider();
    return new RiderOrderResolver(
      { req: { user: { id: world.riderId } } } as never,
      api.sharedOrder,
      api.riderOrderService,
      api.driverRedis,
      api.commonCoupon,
    );
  };
  /** Mutation `cancelOrder(orderId, cancelReasonId)` du repartiteur (admin-api). */
  const dispatcher = () => {
    const api = admin();
    return new DispatcherResolver(
      { req: { user: { id: operatorId } } } as never,
      api.sharedOrder,
      api.orderService,
    );
  };
  /** Ce qu'envoie rider-app pour annuler (order_status_sheet_view.dart). */
  const riderCancel = { status: OrderStatus.RiderCanceled, waitMinutes: 0, tipAmount: 0 };
  const reasonOf = async (orderId: number) => (await orderRow(ds, orderId)).cancelReasonId ?? null;
  const warnings = () =>
    warn.mock.calls.filter((c) => c[1] === 'CancelReason').map((c) => String(c[0]));

  async function acceptedOrder(i = 0): Promise<number> {
    const orderId = await createOrder(ds, world);
    await driver(i).update(orderId, { status: OrderStatus.DriverAccepted });
    return orderId;
  }

  /**
   * Entre deux annulations d'un meme test : chaque chemin cree sa course, les
   * courses deja annulees ne sont plus « en cours » ; on remet les Kasimen en
   * ligne par prudence.
   */
  async function resetOrders() {
    await ds.query(`UPDATE driver SET status = 'online'`);
  }

  /**
   * Les six chemins ; `id` tel que l'envoie GraphQL (chaine pour un ID),
   * undefined = app installee (rien envoye).
   */
  const paths: Array<{
    name: string;
    author: Author;
    status: OrderStatus;
    cancel: (id?: string | number) => Promise<number>;
  }> = [
    {
      name: 'client pendant la recherche (cancelOrder)',
      author: 'Rider',
      status: OrderStatus.RiderCanceled,
      cancel: async (id) => {
        const orderId = await createOrder(ds, world);
        const result = await riderResolver().cancelOrder(id as string);
        expect(result.id).toBe(orderId);
        return orderId;
      },
    },
    {
      name: 'client apres attribution (updateOneOrder RiderCanceled)',
      author: 'Rider',
      status: OrderStatus.RiderCanceled,
      cancel: async (id) => {
        const orderId = await acceptedOrder();
        const update = id === undefined ? riderCancel : { ...riderCancel, cancelReasonId: id };
        await rider().update(orderId, world.riderId, update);
        return orderId;
      },
    },
    {
      name: 'client a la facture (updateOneOrder RiderCanceled, prepaiement)',
      author: 'Rider',
      status: OrderStatus.RiderCanceled,
      cancel: async (id) => {
        const orderId = await createOrder(ds, world, { status: OrderStatus.WaitingForPrePay });
        const update = id === undefined ? riderCancel : { ...riderCancel, cancelReasonId: id };
        await rider().update(orderId, world.riderId, update);
        return orderId;
      },
    },
    {
      name: 'client, reservation (cancelBooking)',
      author: 'Rider',
      status: OrderStatus.RiderCanceled,
      cancel: async (id) => {
        const orderId = await createOrder(ds, world, { status: OrderStatus.Booked });
        await riderResolver().cancelBooking(orderId, id as string);
        return orderId;
      },
    },
    {
      name: 'Kasiman (updateOneOrder DriverCanceled)',
      author: 'Driver',
      status: OrderStatus.DriverCanceled,
      cancel: async (id) => {
        const orderId = await acceptedOrder();
        const update: Record<string, unknown> = { status: OrderStatus.DriverCanceled };
        if (id !== undefined) update.cancelReasonId = id;
        await driver(0).update(orderId, update);
        return orderId;
      },
    },
    {
      name: 'operateur (cancelOrder du repartiteur)',
      author: 'Operator',
      status: OrderStatus.Expired,
      cancel: async (id) => {
        const orderId = await createOrder(ds, world);
        await dispatcher().cancelOrder(orderId, id as string);
        return orderId;
      },
    },
  ];
  const valid = (author: Author) =>
    author === 'Rider' ? r.rider : author === 'Driver' ? r.driver : r.operator;
  const disabled = (author: Author) =>
    author === 'Rider' ? r.riderOff : author === 'Driver' ? r.driverOff : r.operatorOff;
  const otherAuthor = (author: Author) =>
    author === 'Rider' ? r.driver[0] : author === 'Driver' ? r.operator[0] : r.rider[0];

  it('cancelReasons : motifs actifs de l auteur, tries par id, sans userType', async () => {
    expect(await new RiderCancelReasonResolver(ds).cancelReasons()).toEqual([
      { id: r.rider[0], title: 'Attente trop longue' },
      { id: r.rider[1], title: 'Je me suis trompe d adresse' },
    ]);
    expect(await new DriverCancelReasonResolver(ds).cancelReasons()).toEqual([
      { id: r.driver[0], title: 'Le client ne repond pas' },
      { id: r.driver[1], title: 'Panne du vehicule' },
    ]);
    // Catalogue vide : liste vide (l'app annule alors sans motif).
    await ds.query(`UPDATE order_cancel_reason SET "isEnabled" = false`);
    expect(await new RiderCancelReasonResolver(ds).cancelReasons()).toEqual([]);
  });

  for (const path of paths) {
    it(`${path.name} : le motif est ecrit avec le statut`, async () => {
      const reasonId = valid(path.author)[1];
      const orderId = await path.cancel(String(reasonId));
      const row = await orderRow(ds, orderId);
      expect(row.status).toBe(path.status);
      expect(row.cancelReasonId).toBe(reasonId);
      expect(warnings()).toEqual([]);
    });

    it(`${path.name} : sans motif (app installee), annulation faite, motif vide, pas d avertissement`, async () => {
      const orderId = await path.cancel(undefined);
      const row = await orderRow(ds, orderId);
      expect(row.status).toBe(path.status);
      expect(row.cancelReasonId ?? null).toBeNull();
      expect(warnings()).toEqual([]);
    });

    it(`${path.name} : motif desactive, inconnu, d un autre auteur ou illisible : annulation faite, motif vide`, async () => {
      const refused: Array<string | number> = [
        String(disabled(path.author)),
        '987654',
        String(otherAuthor(path.author)),
        'abc',
        '99999999999',
        -1,
      ];
      for (const id of refused) {
        warn.mockClear();
        await resetOrders();
        const orderId = await path.cancel(id);
        const row = await orderRow(ds, orderId);
        expect({ id, status: row.status }).toEqual({ id, status: path.status });
        expect({ id, reason: row.cancelReasonId ?? null }).toEqual({ id, reason: null });
        expect({ id, warnings: warnings().length }).toEqual({ id, warnings: 1 });
      }
    });
  }

  it('rejeu avec un autre motif (client, Kasiman, operateur) : le premier reste', async () => {
    // Client apres attribution : updateOneOrder rejoue, puis cancelOrder.
    const riderOrder = await acceptedOrder(0);
    await rider().update(riderOrder, world.riderId, { ...riderCancel, cancelReasonId: String(r.rider[0]) });
    await concurrently(3, () =>
      rider().update(riderOrder, world.riderId, { ...riderCancel, cancelReasonId: String(r.rider[1]) }),
    );
    await riderResolver().cancelOrder(String(r.rider[1]));
    expect(await reasonOf(riderOrder)).toBe(r.rider[0]);

    // Kasiman.
    const driverOrder = await acceptedOrder(1);
    const driverCancel = (id: number) =>
      buildDriverApi(ds, redis, d, world.driverIds[1]).update(driverOrder, {
        status: OrderStatus.DriverCanceled,
        cancelReasonId: String(id),
      });
    await driverCancel(r.driver[0]);
    await concurrently(3, () => driverCancel(r.driver[1]));
    expect(await reasonOf(driverOrder)).toBe(r.driver[0]);

    // Operateur, puis rejeu sans motif : rien n'est efface.
    const operatorOrder = await createOrder(ds, world);
    await dispatcher().cancelOrder(operatorOrder, String(r.operator[0]));
    await dispatcher().cancelOrder(operatorOrder, String(r.operator[1]));
    await dispatcher().cancelOrder(operatorOrder);
    expect(await reasonOf(operatorOrder)).toBe(r.operator[0]);

    // Deux annulations simultanees avec deux motifs : un seul gagnant, la
    // ligne porte un des deux motifs.
    const raced = await createOrder(ds, world);
    const results = await Promise.allSettled([
      rider().update(raced, world.riderId, { ...riderCancel, cancelReasonId: String(r.rider[0]) }),
      rider().update(raced, world.riderId, { ...riderCancel, cancelReasonId: String(r.rider[1]) }),
    ]);
    expect(results.every((x) => x.status === 'fulfilled')).toBe(true);
    expect(r.rider).toContain(await reasonOf(raced));
  });

  it('pilotCancelReasons compte chaque motif sous le bon auteur', async () => {
    const before = new Date(Date.now() - 60_000);
    // Client : deux avec le motif A (avant et apres attribution), un sans motif.
    await paths[0].cancel(String(r.rider[0]));
    await paths[1].cancel(String(r.rider[0]));
    await paths[3].cancel(undefined);
    // Kasiman : un motif B, puis un motif client refuse (compte « sans motif »).
    await paths[4].cancel(String(r.driver[1]));
    await ds.query(`UPDATE driver SET status = 'online'`);
    await paths[4].cancel(String(r.rider[0]));
    // Operateur : hors des annulations client / Kasiman de l'indicateur 4.
    await paths[5].cancel(String(r.operator[0]));
    const resolver = new PilotInsightsResolver(new PilotInsightsService(ds), ds, {
      req: { user: { id: operatorId } },
    } as never);
    const rows = await resolver.pilotCancelReasons(before, new Date(Date.now() + 60_000));
    expect(
      rows.map((x) => ({
        canceledBy: x.canceledBy,
        reasonId: x.reasonId == null ? null : Number(x.reasonId),
        userType: x.userType ?? null,
        count: x.count,
      })),
    ).toEqual([
      { canceledBy: 'Rider', reasonId: r.rider[0], userType: 'Rider', count: 2 },
      { canceledBy: 'Rider', reasonId: null, userType: null, count: 1 },
      { canceledBy: 'Driver', reasonId: r.driver[1], userType: 'Driver', count: 1 },
      { canceledBy: 'Driver', reasonId: null, userType: null, count: 1 },
    ]);
  });

  it('schema GraphQL : ajouts facultatifs uniquement (contrat avec les apps installees)', () => {
    // Lu dans les metadonnees des decorateurs (celles dont le schema est
    // construit), sans construire de schema : sous ts-jest, le plugin
    // @nestjs/graphql des builds ne tourne pas, et la construction echoue par
    // intermittence sur des types sans rapport selon l'ordre du banc complet
    // (« Cannot determine a GraphQL output type for the "kind" »).
    const meta = compiledMetadata([
      RiderOrderResolver,
      RiderCancelReasonResolver,
      DriverCancelReasonResolver,
      RiderUpdateOrderInput,
      DriverUpdateOrderInput,
      CancelReasonDTO,
    ]);
    // type CancelReason { id: ID! title: String! } : pas de userType.
    expect(meta.fields(CancelReasonDTO, 'object')).toEqual([
      { name: 'id', type: ID, nullable: false },
      { name: 'title', type: String, nullable: false },
    ]);
    // cancelReasons: [CancelReason!]! dans rider-api et driver-api.
    for (const resolver of [RiderCancelReasonResolver, DriverCancelReasonResolver]) {
      const query = meta.query(resolver, 'cancelReasons');
      expect({ list: query.list, type: query.type, nullable: query.nullable, args: query.args }).toEqual({
        list: true,
        type: CancelReasonDTO,
        nullable: false,
        args: [],
      });
    }
    // cancelOrder(cancelReasonId: ID) et cancelBooking(id: ID!, cancelReasonId: ID).
    expect(meta.mutation(RiderOrderResolver, 'cancelOrder').args).toEqual([
      { name: 'cancelReasonId', type: ID, nullable: true },
    ]);
    expect(meta.mutation(RiderOrderResolver, 'cancelBooking').args).toEqual([
      { name: 'id', type: ID, nullable: false },
      { name: 'cancelReasonId', type: ID, nullable: true },
    ]);
    // UpdateOrderInput.cancelReasonId: ID (facultatif) des deux API.
    for (const input of [RiderUpdateOrderInput, DriverUpdateOrderInput]) {
      expect(meta.fields(input, 'input').find((f) => f.name === 'cancelReasonId')).toEqual({
        name: 'cancelReasonId',
        type: ID,
        nullable: true,
      });
    }
    // admin-api : dispatcher-cancel-reason.int-spec.ts.
  });
});
