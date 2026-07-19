import { Injectable, Logger } from '@nestjs/common';
import { PlaceDTO } from './dto/place.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// User-Agent obligatoire : la politique d'usage de Nominatim rejette
// (403/429) les requêtes serveur qui n'identifient pas l'application.
const NOMINATIM_USER_AGENT = 'Kasi/1.0 (+https://kasigroupe.tech)';

@Injectable()
export class NominitamGeoService {
  private readonly logger = new Logger(NominitamGeoService.name);

  constructor(private httpService: HttpService) {}

  async getPlaces(input: {
    keyword?: string;
    location?: {
      lat: number;
      lng: number;
    };
    radius?: number;
    language?: string;
  }): Promise<PlaceDTO[]> {
    try {
      const params: Record<string, string> = {
        q: input.keyword ?? '',
        format: 'json',
        addressdetails: '1',
      };
      // Le mobile envoie location=null tant que la position courante n'est
      // pas résolue : le viewbox est donc strictement optionnel.
      if (input.location != null) {
        params.viewbox = `${input.location.lng - 1},${input.location.lat - 1},${
          input.location.lng + 1
        },${input.location.lat + 1}`;
      }
      if (input.language != null) {
        params['accept-language'] = input.language;
      }
      const result = await firstValueFrom(
        this.httpService.get('https://nominatim.openstreetmap.org/search', {
          params,
          headers: { 'User-Agent': NOMINATIM_USER_AGENT },
        }),
      );
      return (result.data ?? []).map((prediction) => {
        const placeDTO: PlaceDTO = {
          point: {
            // Nominatim renvoie lat/lon en chaînes de caractères.
            lat: parseFloat(prediction.lat),
            lng: parseFloat(prediction.lon),
          },
          title: prediction.name,
          address: prediction.display_name,
        };
        return placeDTO;
      });
    } catch (error) {
      this.logger.error(`Recherche Nominatim en échec: ${error}`);
      return [];
    }
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<PlaceDTO> {
    try {
      const params: Record<string, string | number> = {
        lat: input.lat,
        lon: input.lng,
        format: 'json',
      };
      if (input.language != null) {
        params['accept-language'] = input.language;
      }
      const result = await firstValueFrom(
        this.httpService.get('https://nominatim.openstreetmap.org/reverse', {
          params,
          headers: { 'User-Agent': NOMINATIM_USER_AGENT },
        }),
      );
      return {
        point: {
          lat: input.lat,
          lng: input.lng,
        },
        title: result.data?.name,
        address: result.data?.display_name ?? '',
      };
    } catch (error) {
      // Ne jamais laisser remonter : le mobile combine reverseGeocode et
      // getDriversLocation dans une seule query ; une exception ici
      // empêcherait toute localisation du rider.
      this.logger.error(`Reverse geocoding Nominatim en échec: ${error}`);
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
