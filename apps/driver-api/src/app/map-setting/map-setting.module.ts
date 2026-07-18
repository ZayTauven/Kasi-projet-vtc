import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { MapSettingResolver } from './map-setting.resolver';
import { MapSettingService } from './map-setting.service';

// Lecture seule du singleton MapSetting pour l'app mobile.
@Module({
  imports: [TypeOrmModule.forFeature([MapSettingEntity])],
  providers: [MapSettingResolver, MapSettingService],
})
export class MapSettingModule {}
