import { Client } from '@googlemaps/google-maps-services-js';
import { Injectable } from '@nestjs/common';
import { SharedConfigurationService } from 'libs/database/src/lib/shared-configuration.service';
import { PlaceDTO } from './dto/place.dto';
import { Point } from '@kasi/database';

@Injectable()
export class GoogleGeoService {
  googleClient = new Client({});

  constructor(private configurationService: SharedConfigurationService) {}

  async getPlaces(input: {
    keyword?: string;
    location: Point;
    radius?: number;
    language?: string;
  }): Promise<PlaceDTO[]> {
    const config = await this.configurationService.getConfiguration();
    const response = await this.googleClient.placesNearby({
      params: {
        location: input.location,
        radius: input.radius,
        keyword: input.keyword,
        language: input.language as any,
        key: config!.backendMapsAPIKey!,
      },
    });
    console.log(response.data.results);
    return response.data.results.map((result) => ({
      point: {
        lat: result.geometry!.location.lat,
        lng: result.geometry!.location.lng,
      },
      title: result.name!,
      address: result.formatted_address!,
    }));
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<PlaceDTO> {
    const config = await this.configurationService.getConfiguration();
    const response = await this.googleClient.reverseGeocode({
      params: {
        latlng: {
          lat: input.lat,
          lng: input.lng,
        },
        language: input.language as any,
        key: config!.backendMapsAPIKey!,
      },
    });
    return {
      point: {
        lat: input.lat,
        lng: input.lng,
      },
      address: response.data.results[0].formatted_address,
    };
  }
}
