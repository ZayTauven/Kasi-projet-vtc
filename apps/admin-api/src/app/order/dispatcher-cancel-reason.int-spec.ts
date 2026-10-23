/**
 * p3-mesures M4, lot A1 (2026-10-22) : signature GraphQL de l'annulation par
 * l'operateur (admin-api), ajout facultatif `cancelReasonId`. Le comportement
 * est verifie dans apps/rider-api/src/app/order/cancel-reasons.int-spec.ts ;
 * ce fichier a part evite d'avoir dans le meme processus Jest les types
 * `Order` de rider-api et d'admin-api.
 *
 *   npm run test:integration -- dispatcher-cancel-reason
 */
import { ID } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';

import { DispatcherResolver } from './dispatcher.resolver';

describe('admin-api : cancelOrder du repartiteur (p3-mesures M4, A1)', () => {
  it('signature GraphQL : cancelOrder(orderId: ID!, cancelReasonId: ID), motif facultatif', () => {
    // Le schema complet d'admin-api ne se construit pas sous ts-jest (le plugin
    // @nestjs/graphql des builds n'y tourne pas : DTO herites sans @Field). On
    // lit donc les metadonnees des arguments declares par @Args, celles dont
    // le schema est construit.
    LazyMetadataStorage.load([DispatcherResolver]);
    TypeMetadataStorage.compile();
    const mutation = TypeMetadataStorage.getMutationsMetadata().find(
      (m) => m.target === DispatcherResolver && m.methodName === 'cancelOrder',
    );
    const args = (mutation?.methodArgs ?? []).map((a) => ({
      name: (a as { name?: string }).name,
      type: a.typeFn?.(),
      nullable: a.options?.nullable ?? false,
      index: a.index,
    }));
    expect(args.sort((a, b) => a.index - b.index)).toEqual([
      { name: 'orderId', type: ID, nullable: false, index: 0 },
      { name: 'cancelReasonId', type: ID, nullable: true, index: 1 },
    ]);
  });
});
