import { Authorize } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MapTileProvider } from '@kasi/database/enums/map-tile-provider.enum';
import { MapSettingAuthorizer } from './map-setting.authorizer';

// Singleton MapSetting exposé à l'admin. @Authorize documente le modèle de
// permission (calqué sur ShiftRule) ; l'enforcement effectif est fait dans le
// resolver custom (voir map-setting.resolver.ts), ce dernier n'étant pas câblé
// via nestjs-query.
@ObjectType('MapSetting')
@Authorize(MapSettingAuthorizer)
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
