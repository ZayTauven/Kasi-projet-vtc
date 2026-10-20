import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { MapTileProvider } from '../../entities/enums/map-tile-provider.enum';
import { Point } from '../../interfaces/point';
import { GoogleServicesService } from '../google-services/google-services.service';

/**
 * p2-argent I4 (2026-10-20) : d'ou vient l'itineraire. `haversine` = estimation
 * a vol d'oiseau (aucun fournisseur n'a repondu) : FareQuoteService refuse
 * d'en faire un devis, sauf forfait de zone (fiche argent §5.4, KASI_DECISIONS).
 */
export type RouteSource = 'mapbox' | 'google' | 'osrm' | 'haversine' | 'none';

export interface RouteMetrics {
  distance: number; // metres
  duration: number; // secondes
  directions: { lat: number; lng: number }[]; // trace decode
  source: RouteSource;
}

/**
 * p2-dispatch D5 (2026-10-20, Q7) : un trajet de la matrice (candidat vers le
 * point de depart). `null` : aucun itineraire trouve par le fournisseur.
 */
export interface MatrixLeg {
  distance: number | null; // metres
  duration: number | null; // secondes
}

export interface MatrixResult {
  legs: MatrixLeg[];
  source: 'mapbox' | 'osrm' | 'haversine';
}

/** Q7 : au plus 10 candidats par appel de matrice (quota Mapbox). */
export const MATRIX_MAX_ORIGINS = 10;

/** Vrai calcul routier (Mapbox, Google, OSRM), et non une estimation. */
export function isRealRoute(source: RouteSource | undefined | null): boolean {
  return source === 'mapbox' || source === 'google' || source === 'osrm';
}

// Calcul distance/duree/trace d'un itineraire, route selon le provider
// cartographique effectif (singleton map_setting, meme source que la carte
// mobile). Ridy = 100% Google Distance Matrix ; Kasi = Mapbox -> il fallait
// debrancher la dependance Google (cle vide => HTTP 403 sur getFare/createOrder).
//
// Invariant : cette methode ne DOIT JAMAIS lever d'exception reseau
// (403/timeout) ; elle degrade (OSRM public puis estimation haversine) et
// INDIQUE sa source (`source`). p2-argent I4 (2026-10-20, fiche §5.4) :
// l'ancien invariant « un devis doit toujours etre calculable » est leve :
// c'est FareQuoteService qui refuse un devis sur une estimation haversine.
// Les autres appelants (ETA de prise en charge) gardent l'estimation.
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
      return { distance: 0, duration: 0, directions: [], source: 'none' };
    }
    const setting = await this.getSetting();
    const provider = this.resolveProvider(setting);

    if (provider === MapTileProvider.Google) {
      // Chemin Google historique conserve intact (si une cle est fournie).
      try {
        return {
          ...(await this.googleServices.getSumDistanceAndDuration(points)),
          source: 'google',
        };
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

  /**
   * p2-dispatch D5 (2026-10-20, Q7) : distance et duree routieres de chaque
   * origine (Kasiman) vers `destination` (point de depart), pour classer une
   * vague. Matrice Mapbox avec le meme jeton que les itineraires
   * (`map_setting.mapboxToken`), au plus 10 origines par appel, repli sur la
   * table OSRM puis sur l'estimation a vol d'oiseau. Ne leve jamais : le
   * dispatch ne doit pas s'arreter faute de routage.
   */
  async getDurationsTo(origins: Point[], destination: Point): Promise<MatrixResult> {
    if (origins.length === 0) return { legs: [], source: 'haversine' };
    if (origins.length > MATRIX_MAX_ORIGINS) {
      // Decoupage en appels de 10 : la source retenue est la moins bonne.
      const parts: MatrixResult[] = [];
      for (let i = 0; i < origins.length; i += MATRIX_MAX_ORIGINS) {
        parts.push(await this.getDurationsTo(origins.slice(i, i + MATRIX_MAX_ORIGINS), destination));
      }
      const order = ['mapbox', 'osrm', 'haversine'];
      return {
        legs: parts.flatMap((p) => p.legs),
        source: parts.map((p) => p.source).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0],
      };
    }
    let setting: MapSettingEntity | null = null;
    try {
      setting = await this.getSetting();
    } catch (error) {
      this.logger.warn(`map_setting illisible, matrice en repli : ${error}`);
    }
    const coords = [...origins, destination].map((p) => `${p.lng},${p.lat}`).join(';');
    const params = {
      sources: origins.map((_, i) => i).join(';'),
      destinations: String(origins.length),
      annotations: 'distance,duration',
    };
    if (this.resolveProvider(setting) === MapTileProvider.Mapbox && setting?.mapboxToken) {
      const legs = await this.tryMatrix(
        `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}`,
        { ...params, access_token: setting.mapboxToken },
        origins.length,
        'Mapbox Matrix',
      );
      if (legs != null) return { legs, source: 'mapbox' };
    }
    const legs = await this.tryMatrix(
      `https://router.project-osrm.org/table/v1/driving/${coords}`,
      params,
      origins.length,
      'OSRM table',
    );
    if (legs != null) return { legs, source: 'osrm' };
    return {
      legs: origins.map((origin) => {
        const distance = Math.round(this.haversine(origin, destination) * RoutingService.ROUTE_DETOUR_FACTOR);
        return { distance, duration: Math.round(distance / RoutingService.FALLBACK_SPEED_MPS) };
      }),
      source: 'haversine',
    };
  }

  /** Matrice Mapbox ou table OSRM (meme format de reponse). Null si en echec. */
  private async tryMatrix(
    url: string,
    params: Record<string, string>,
    count: number,
    label: string,
  ): Promise<MatrixLeg[] | null> {
    try {
      const result = await firstValueFrom(this.httpService.get(url, { params, timeout: 5_000 }));
      const durations: Array<Array<number | null>> | undefined = result.data?.durations;
      const distances: Array<Array<number | null>> | undefined = result.data?.distances;
      if (result.data?.code !== 'Ok' || !Array.isArray(durations) || durations.length !== count) {
        this.logger.warn(`${label} sans resultat (code=${result.data?.code})`);
        return null;
      }
      const round = (x: number | null | undefined) => (x == null ? null : Math.round(x));
      return durations.map((row, i) => ({
        duration: round(row?.[0]),
        distance: round(distances?.[i]?.[0]),
      }));
    } catch (error) {
      this.logger.warn(`${label} en echec, repli : ${error}`);
      return null;
    }
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
        source: 'mapbox',
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
          source: 'osrm',
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
      source: 'haversine',
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
