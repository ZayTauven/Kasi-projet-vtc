import { registerEnumType } from '@nestjs/graphql';

// Fournisseur de tuiles cartographiques piloté à chaud depuis l'admin (MapSetting
// singleton), lu par rider-api et driver-api pour configurer la carte des apps
// mobiles sans rebuild. Les valeurs sérialisées sont contractuelles.
export enum MapTileProvider {
  Mapbox = 'Mapbox',
  OpenStreetMap = 'OpenStreetMap',
  Google = 'Google',
}

registerEnumType(MapTileProvider, { name: 'MapTileProvider' });
