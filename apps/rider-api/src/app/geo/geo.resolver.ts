import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { PlaceDTO } from './dto/place.dto';
import { GeoProvider } from './dto/geo-provider.enum';
import { GoogleGeoService } from './google-geo.service';
import { NominitamGeoService } from './nominitam-geo.service';
import { MapboxGeoService } from './mapbox-geo.service';
import { Point } from '@kasi/database';

@Resolver()
export class GeoResolver {
  constructor(
    private googleGeoService: GoogleGeoService,
    private nominitamGeoService: NominitamGeoService,
    private mapboxGeoService: MapboxGeoService,
  ) {}

  // 'nominitam' est conservé pour compat avec la faute de frappe historique
  // de Ridy dans les déploiements existants.
  private resolveProvider(provider?: GeoProvider): GeoProvider | undefined {
    const serverProvider = process.env.GEO_PROVIDER as EnvGeoProvider;
    if (serverProvider != null) {
      if (serverProvider == 'google') {
        return GeoProvider.GOOGLE;
      }
      if (serverProvider == 'nominitam' || serverProvider == 'nominatim') {
        return GeoProvider.NOMINATIM;
      }
      if (serverProvider == 'mapbox') {
        return GeoProvider.MAPBOX;
      }
    }
    return provider;
  }

  @Query(() => [PlaceDTO])
  async getPlaces(
    @Args('keyword') keyword: string,
    @Args('location', { nullable: true }) location?: Point,
    @Args('radius', {
      nullable: true,
      type: () => Int,
      description: 'Search radius from location argument in meters',
    })
    radius?: number,
    @Args('language', { nullable: true }) language?: string,
    @Args('provider', { nullable: true, type: () => GeoProvider })
    provider?: GeoProvider,
  ): Promise<PlaceDTO[]> {
    provider = this.resolveProvider(provider);
    if (provider === GeoProvider.GOOGLE) {
      return this.googleGeoService.getPlaces({
        keyword,
        location,
        radius,
        language,
      });
    } else if (provider === GeoProvider.MAPBOX) {
      return this.mapboxGeoService.getPlaces({
        keyword,
        location,
        radius,
        language,
      });
    } else {
      return this.nominitamGeoService.getPlaces({
        keyword,
        location,
        radius,
        language,
      });
    }
  }

  @Query(() => PlaceDTO)
  async reverseGeocode(
    @Args('location') location: Point,
    @Args('language', { nullable: true }) language?: string,
    @Args('provider', { nullable: true, type: () => GeoProvider })
    provider?: GeoProvider,
  ): Promise<PlaceDTO> {
    provider = this.resolveProvider(provider);
    if (provider === GeoProvider.GOOGLE) {
      return this.googleGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
      });
    } else if (provider === GeoProvider.MAPBOX) {
      return this.mapboxGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
      });
    } else {
      return this.nominitamGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
      });
    }
  }
}

type EnvGeoProvider = 'google' | 'nominitam' | 'nominatim' | 'mapbox';
