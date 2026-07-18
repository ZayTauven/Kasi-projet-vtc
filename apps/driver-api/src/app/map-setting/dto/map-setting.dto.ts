import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MapTileProvider } from '@kasi/database/enums/map-tile-provider.enum';

// Vue read-only du singleton MapSetting pour l'app mobile : pilote le
// fournisseur de carte (Mapbox / OpenStreetMap / Google) sans rebuild.
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

  @Field({ nullable: true })
  googleMapsApiKey?: string;

  @Field()
  updatedAt!: Date;
}
