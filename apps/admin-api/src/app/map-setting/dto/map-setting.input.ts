import { Field, InputType } from '@nestjs/graphql';
import { MapTileProvider } from '@kasi/database/enums/map-tile-provider.enum';

// Champs éditables du singleton MapSetting, tous optionnels (mise à jour
// partielle). Le type GraphQL s'appelle exactement UpdateMapSettingInput,
// contrat attendu du panel.
@InputType()
export class UpdateMapSettingInput {
  @Field(() => MapTileProvider, { nullable: true })
  provider?: MapTileProvider;

  @Field({ nullable: true })
  mapboxToken?: string;

  @Field({ nullable: true })
  mapboxStyleUser?: string;

  @Field({ nullable: true })
  mapboxStyleId?: string;

  @Field({ nullable: true })
  googleMapsApiKey?: string;
}
