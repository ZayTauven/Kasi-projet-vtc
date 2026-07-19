import { Query, Resolver } from '@nestjs/graphql';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { MapSettingDTO } from './dto/map-setting.dto';
import { MapSettingService } from './map-setting.service';

// Resolver READ-ONLY et PUBLIC (pas de GqlAuthGuard) : l'app affiche une carte
// AVANT login (écran de sélection d'adresse côté rider), donc le choix de
// fournisseur fait au panel doit pouvoir être lu sans JWT — sinon il ne
// s'applique jamais au premier écran et un `mapProvider` périmé en cache local
// reste autoritaire indéfiniment.
// Exposition maîtrisée : le token Mapbox est un `pk.*`, public par conception et
// de toute façon extractible du binaire de l'APK. `googleMapsApiKey` est
// délibérément ABSENT du DTO mobile (voir dto/map-setting.dto.ts) : la clé du SDK
// Google est native/compile-time, donc inutile ici. Aucune mutation.
@Resolver()
export class MapSettingResolver {
  constructor(private mapSettingService: MapSettingService) {}

  @Query(() => MapSettingDTO)
  async mapSetting(): Promise<MapSettingEntity> {
    return this.mapSettingService.get();
  }
}
