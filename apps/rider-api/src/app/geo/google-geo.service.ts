import { Client } from '@googlemaps/google-maps-services-js';
import { Injectable, Logger } from '@nestjs/common';
import { SharedConfigurationService } from 'libs/database/src/lib/shared-configuration.service';
import { PlaceDTO } from './dto/place.dto';
import { Point } from '@kasi/database';
import { NominitamGeoService } from './nominitam-geo.service';

// Clé backendMapsAPIKey absente ou erreur Google => repli sur Nominatim,
// jamais d'exception qui remonte : le mobile combine reverseGeocode et
// getDriversLocation dans une seule query, un échec ici bloquerait la
// localisation du rider.
@Injectable()
export class GoogleGeoService {
  private readonly logger = new Logger(GoogleGeoService.name);

  googleClient = new Client({});

  constructor(
    private configurationService: SharedConfigurationService,
    private nominitamGeoService: NominitamGeoService,
  ) {}

  async getPlaces(input: {
    keyword?: string;
    location?: Point;
    radius?: number;
    language?: string;
  }): Promise<PlaceDTO[]> {
    const config = await this.configurationService.getConfiguration();
    if (!config?.backendMapsAPIKey) {
      this.logger.warn('backendMapsAPIKey absente, repli sur Nominatim');
      return this.nominitamGeoService.getPlaces(input);
    }
    try {
      const results = [];
      const response = await this.googleClient.placeAutocomplete({
        params: {
          input: input.keyword,
          location: input.location,
          radius: input.radius,
          language: input.language as any,
          key: config.backendMapsAPIKey,
        },
      });
      for (let i = 0; i < response.data.predictions.length; i++) {
        const geocoding = await this.googleClient.reverseGeocode({
          params: {
            place_id: response.data.predictions[i].place_id,
            key: config.backendMapsAPIKey,
          },
        });
        results.push({
          point: {
            lat: geocoding.data.results[0].geometry.location.lat,
            lng: geocoding.data.results[0].geometry.location.lng,
          },
          title: response.data.predictions[i].structured_formatting.main_text,
          address:
            response.data.predictions[i].structured_formatting.secondary_text,
        });
      }
      return results;
    } catch (error) {
      this.logger.error(`Recherche Google en échec: ${error}`);
      return this.nominitamGeoService.getPlaces(input);
    }
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<PlaceDTO> {
    const config = await this.configurationService.getConfiguration();
    if (!config?.backendMapsAPIKey) {
      this.logger.warn('backendMapsAPIKey absente, repli sur Nominatim');
      return this.nominitamGeoService.reverseGeocode(input);
    }
    try {
      const response = await this.googleClient.reverseGeocode({
        params: {
          latlng: {
            lat: input.lat,
            lng: input.lng,
          },
          language: input.language as any,
          key: config.backendMapsAPIKey,
        },
      });
      return {
        point: {
          lat: input.lat,
          lng: input.lng,
        },
        address: response.data.results[0]?.formatted_address ?? '',
      };
    } catch (error) {
      this.logger.error(`Reverse geocoding Google en échec: ${error}`);
      return this.nominitamGeoService.reverseGeocode(input);
    }
  }
}
