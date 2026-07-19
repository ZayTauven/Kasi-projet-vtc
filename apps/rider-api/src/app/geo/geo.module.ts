import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { GeoResolver } from './geo.resolver';
import { GoogleGeoService } from './google-geo.service';
import { NominitamGeoService } from './nominitam-geo.service';
import { MapboxGeoService } from './mapbox-geo.service';
import { SharedConfigurationService } from 'libs/database/src/lib/shared-configuration.service';

@Module({
  // MapSettingEntity : source du token Mapbox (même singleton que la query
  // GraphQL mapSetting exposée au mobile).
  imports: [HttpModule, TypeOrmModule.forFeature([MapSettingEntity])],
  providers: [
    GeoResolver,
    GoogleGeoService,
    NominitamGeoService,
    MapboxGeoService,
    SharedConfigurationService,
  ],
})
export class GeoModule {}
