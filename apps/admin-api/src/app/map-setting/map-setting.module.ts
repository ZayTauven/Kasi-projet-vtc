import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { MapSettingResolver } from './map-setting.resolver';
import { MapSettingService } from './map-setting.service';

// Singleton MapSetting côté admin : lecture (mapSetting) + écriture
// (updateMapSetting) via resolver custom. OperatorEntity est enregistré pour
// le contrôle de permission manuel du resolver.
@Module({
  imports: [TypeOrmModule.forFeature([MapSettingEntity, OperatorEntity])],
  providers: [MapSettingResolver, MapSettingService],
})
export class MapSettingModule {}
