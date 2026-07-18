import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';

// Lecture seule du singleton MapSetting. getOrCreate garantit qu'une ligne
// existe toujours (valeurs par défaut portées par l'entité TypeORM), même si
// l'admin ne l'a pas encore configurée.
@Injectable()
export class MapSettingService {
  constructor(
    @InjectRepository(MapSettingEntity)
    private mapSettingRepo: Repository<MapSettingEntity>,
  ) {}

  async get(): Promise<MapSettingEntity> {
    const existing = await this.mapSettingRepo.findOne({ where: {} });
    if (existing) {
      return existing;
    }
    return this.mapSettingRepo.save(this.mapSettingRepo.create({}));
  }
}
