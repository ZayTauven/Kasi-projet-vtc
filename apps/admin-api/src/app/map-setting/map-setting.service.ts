import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { UpdateMapSettingInput } from './dto/map-setting.input';

// Service du singleton MapSetting. getOrCreate garantit qu'une unique ligne
// existe toujours (valeurs par défaut portées par l'entité TypeORM).
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

  async update(input: UpdateMapSettingInput): Promise<MapSettingEntity> {
    const current = await this.get();
    return this.mapSettingRepo.save({ ...current, ...input });
  }
}
