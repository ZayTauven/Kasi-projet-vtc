import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { MapTileProvider } from '../../entities/enums/map-tile-provider.enum';
import { Point } from '../../interfaces/point';
import { GoogleServicesService } from '../google-services/google-services.service';

export interface RouteMetrics {
  distance: number; // metres
  duration: number; // secondes
  directions: { lat: number; lng: number }[]; // trace decode
}

// Calcul distance/duree/trace d'un itineraire, route selon le provider
// cartographique effectif (singleton map_setting, meme source que la carte
// mobile). Ridy = 100% Google Distance Matrix ; Kasi = Mapbox -> il fallait
// debrancher la dependance Google (cle vide => HTTP 403 sur getFare/createOrder).
//
// Invariant capital : cette methode ne DOIT JAMAIS lever d'exception reseau
// (403/timeout). getFare et createOrder en dependent : un devis doit toujours
// etre calculable, quitte a degrader (OSRM public puis estimation haversine).
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  // Vitesse moyenne urbaine retenue pour l'estimation degradee (~30 km/h).
  private static readonly FALLBACK_SPEED_MPS = 30000 / 3600;
  // Facteur de sinuosite : distance route ~ distance vol d'oiseau x 1.3.
  private static readonly ROUTE_DETOUR_FACTOR = 1.3;

  constructor(
    private httpService: HttpService,
    @InjectRepository(MapSettingEntity)
    private mapSettingRepo: Repository<MapSettingEntity>,
    private googleServices: GoogleServicesService,
  ) {}

  private async getSetting(): Promise<MapSettingEntity | null> {
    return this.mapSettingRepo.findOne({ where: {} });
  }

  // Provider effectif : override d'env (ROUTING_PROVIDER, sinon GEO_PROVIDER
  // pour rester coherent avec le GeoResolver) prioritaire, sinon map_setting.
  private resolveProvider(setting: MapSettingEntity | null): MapTileProvider {
    const env = (
      process.env.ROUTING_PROVIDER ?? process.env.GEO_PROVIDER
    )?.toLowerCase();
    if (env === 'mapbox') return MapTileProvider.Mapbox;
    if (env === 'google') return MapTileProvider.Google;
    if (
      env === 'osm' ||
      env === 'openstreetmap' ||
      env === 'nominatim' ||
      env === 'nominitam'
    ) {
      return MapTileProvider.OpenStreetMap;
    }
    return setting?.provider ?? MapTileProvider.OpenStreetMap;
  }

  async getSumDistanceAndDuration(points: Point[]): Promise<RouteMetrics> {
    if (points == null || points.length < 2) {
      return { distance: 0, duration: 0, directions: [] };
    }
    const setting = await this.getSetting();
    const provider = this.resolveProvider(setting);

    if (provider === MapTileProvider.Google) {
      // Chemin Google historique conserve intact (si une cle est fournie).
      try {
        return await this.googleServices.getSumDistanceAndDuration(points);
      } catch (error) {
        this.logger.error(`Google routing en echec, repli: ${error}`);
        return this.fallback(points);
      }
    }

    if (provider === MapTileProvider.Mapbox) {
      const token = setting?.mapboxToken ?? null;
      if (token) {
        const viaMapbox = await this.tryMapbox(points, token);
        if (viaMapbox != null) return viaMapbox;
      } else {
        this.logger.warn('mapboxToken absent de map_setting, repli routing');
      }
    }

    // OpenStreetMap explicite, ou repli d'un Mapbox indisponible.
    return this.fallback(points);
  }

  // Directions Mapbox : un seul appel pour tout le trajet ordonne (plus
  // efficace que la boucle point-a-point de Google). geometries=polyline =>
  // polyline precision 1e5, decodable par le decode() existant.
  private async tryMapbox(
    points: Point[],
    token: string,
  ): Promise<RouteMetrics | null> {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    try {
      const result = await firstValueFrom(
        this.httpService.get(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`,
          {
            params: {
              access_token: token,
              overview: 'full',
              geometries: 'polyline',
            },
          },
        ),
      );
      const route = result.data?.routes?.[0];
      if (result.data?.code !== 'Ok' || route == null) {
        this.logger.warn(
          `Mapbox Directions sans route (code=${result.data?.code})`,
        );
        return null;
      }
      return {
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
        // Trace toujours renvoye (la carte mobile en depend) — independant
        // de SHOW_DIRECTIONS, la geometrie est deja dans cette reponse.
        directions: this.googleServices.decode(route.geometry) ?? [],
      };
    } catch (error) {
      this.logger.error(`Mapbox Directions en echec, repli: ${error}`);
      return null;
    }
  }

  // Repli 1 : OSRM public (meme format lng,lat;... ; polyline 1e5).
  // Repli 2 : estimation haversine si OSRM indisponible.
  private async fallback(points: Point[]): Promise<RouteMetrics> {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    try {
      const result = await firstValueFrom(
        this.httpService.get(
          `https://router.project-osrm.org/route/v1/driving/${coords}`,
          { params: { overview: 'full', geometries: 'polyline' } },
        ),
      );
      const route = result.data?.routes?.[0];
      if (result.data?.code === 'Ok' && route != null) {
        return {
          distance: Math.round(route.distance),
          duration: Math.round(route.duration),
          directions: this.googleServices.decode(route.geometry) ?? [],
        };
      }
    } catch (error) {
      this.logger.warn(`OSRM en echec, estimation haversine: ${error}`);
    }
    return this.haversineEstimate(points);
  }

  // Estimation vol d'oiseau x facteur detour ; le trace degrade = les points
  // saisis relies en ligne droite (mieux qu'un trace vide cote mobile).
  private haversineEstimate(points: Point[]): RouteMetrics {
    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      distance += this.haversine(points[i], points[i + 1]);
    }
    distance = Math.round(distance * RoutingService.ROUTE_DETOUR_FACTOR);
    return {
      distance,
      duration: Math.round(distance / RoutingService.FALLBACK_SPEED_MPS),
      directions: points.map((p) => ({ lat: p.lat, lng: p.lng })),
    };
  }

  private haversine(a: Point, b: Point): number {
    const R = 6371000; // rayon terrestre en metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}
