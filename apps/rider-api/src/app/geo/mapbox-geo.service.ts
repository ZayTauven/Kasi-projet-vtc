import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { PlaceDTO } from './dto/place.dto';
import { NominitamGeoService } from './nominitam-geo.service';

// Géocodage Mapbox (API Geocoding v5). Le token est lu depuis le singleton
// map_setting, même source que la query GraphQL mapSetting.mapboxToken
// consommée par le mobile : un seul endroit à configurer côté admin.
// Token absent ou erreur HTTP => repli silencieux sur Nominatim, jamais
// d'exception qui remonte (contrat identique aux autres providers).
@Injectable()
export class MapboxGeoService {
  private readonly logger = new Logger(MapboxGeoService.name);

  constructor(
    private httpService: HttpService,
    @InjectRepository(MapSettingEntity)
    private mapSettingRepo: Repository<MapSettingEntity>,
    private nominitamGeoService: NominitamGeoService,
  ) {}

  private async getToken(): Promise<string | null> {
    const setting = await this.mapSettingRepo.findOne({ where: {} });
    return setting?.mapboxToken ?? null;
  }

  // La recherche de lieux est déléguée à Nominatim, y compris quand le
  // provider demandé est MAPBOX : l'index POI de Mapbox (Geocoding v5 comme
  // Search Box v1) ne couvre pas le Sénégal — vérifié empiriquement le
  // 2026-07-18 : « marche sandaga » avec proximity Dakar renvoie des homonymes
  // en Belgique/Canada, et zéro résultat avec country=sn, là où OSM/Nominatim
  // trouve le vrai Marché Sandaga. Le reverse geocoding, lui, reste sur
  // Mapbox : sa couverture d'adresses est bonne et ses libellés plus propres.
  async getPlaces(input: {
    keyword?: string;
    location?: {
      lat: number;
      lng: number;
    };
    radius?: number;
    language?: string;
  }): Promise<PlaceDTO[]> {
    return this.nominitamGeoService.getPlaces(input);
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<PlaceDTO> {
    const token = await this.getToken();
    if (!token) {
      this.logger.warn('mapboxToken absent de map_setting, repli sur Nominatim');
      return this.nominitamGeoService.reverseGeocode(input);
    }
    try {
      const params: Record<string, string | number> = {
        access_token: token,
        limit: 1,
      };
      if (input.language != null) {
        params.language = input.language;
      }
      const result = await firstValueFrom(
        this.httpService.get(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${input.lng},${input.lat}.json`,
          { params },
        ),
      );
      const feature = result.data?.features?.[0];
      return {
        point: {
          lat: input.lat,
          lng: input.lng,
        },
        title: feature?.text,
        address: feature?.place_name ?? '',
      };
    } catch (error) {
      this.logger.error(`Reverse geocoding Mapbox en échec: ${error}`);
      return {
        point: {
          lat: input.lat,
          lng: input.lng,
        },
        address: '',
      };
    }
  }
}
