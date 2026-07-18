import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { MapSettingDTO } from './dto/map-setting.dto';
import { MapSettingService } from './map-setting.service';

// Resolver READ-ONLY : expose la configuration cartographique au client mobile,
// protégé par le JWT mobile (GqlAuthGuard). Aucune mutation.
@Resolver()
@UseGuards(GqlAuthGuard)
export class MapSettingResolver {
  constructor(private mapSettingService: MapSettingService) {}

  @Query(() => MapSettingDTO)
  async mapSetting(): Promise<MapSettingEntity> {
    return this.mapSettingService.get();
  }
}
