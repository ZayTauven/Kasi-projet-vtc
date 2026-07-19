import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MapTileProvider } from '@kasi/database/enums/map-tile-provider.enum';

// Vue read-only du singleton MapSetting pour l'app mobile : pilote le
// fournisseur de carte (Mapbox / OpenStreetMap / Google) sans rebuild.
// Ce DTO est servi par un resolver PUBLIC (voir map-setting.resolver.ts), donc il
// n'expose QUE de la config publique : le token Mapbox est un `pk.*`, public par
// conception. `googleMapsApiKey` est volontairement absent — la clé du SDK Google
// est native (AndroidManifest / Info.plist, compile-time) et n'est donc d'aucune
// utilité au client mobile ; l'omettre supprime l'exposition au lieu de la filtrer.
// Le panel garde l'accès à ce champ via admin-api, qui reste authentifié.
@ObjectType('MapSetting')
export class MapSettingDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => MapTileProvider)
  provider!: MapTileProvider;

  @Field({ nullable: true })
  mapboxToken?: string;

  @Field()
  mapboxStyleUser!: string;

  @Field()
  mapboxStyleId!: string;

  @Field()
  updatedAt!: Date;
}
