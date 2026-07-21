import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point } from '@kasi/database';
import { RegionEntity } from '@kasi/database/region.entity';
import { ServiceEntity } from '@kasi/database/service.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(RegionEntity)
    private regionRepository: Repository<RegionEntity>,
  ) {}

  async getRegionWithPoint(point: Point): Promise<RegionEntity[]> {
    // SQL Postgres/PostGIS : placeholders $1/$2, SRID 4326 (SRID de region.location).
    const regions: RegionEntity[] = await this.regionRepository.query(
      `SELECT * FROM region WHERE enabled=TRUE AND ST_Within(ST_SetSRID(ST_MakePoint($1, $2), 4326), region.location)`,
      [point.lng, point.lat],
    );
    return regions;
  }

  async getRegionServices(regionId: number): Promise<ServiceEntity[]> {
    return (
      (
        await this.regionRepository.findOne({
          where: { id: regionId },
          relations: { services: true },
        })
      )?.services ?? []
    );
  }
}
