import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { GoogleServicesModule } from '../google-services/google-services.module';
import { RoutingService } from './routing.service';

// RoutingService depend du singleton map_setting (provider + token) et
// reutilise GoogleServicesService (chemin Google + decode() de polyline).
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([MapSettingEntity]),
    GoogleServicesModule,
  ],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
