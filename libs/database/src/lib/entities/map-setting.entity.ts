import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MapTileProvider } from './enums/map-tile-provider.enum';

// Configuration cartographique singleton Kasi. Comme les autres entités du
// dossier (shift-rule, retention-policy), l'entité reste du TypeORM PUR :
// l'exposition GraphQL est portée par les DTO/Input de chaque API.
// Une unique ligne est attendue (getOrCreate côté service).
@Entity('map_setting')
export class MapSettingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('enum', {
    enum: MapTileProvider,
    default: MapTileProvider.OpenStreetMap,
  })
  provider!: MapTileProvider;

  @Column({ type: 'varchar', nullable: true })
  mapboxToken?: string | null;

  @Column({ type: 'varchar', default: 'mapbox' })
  mapboxStyleUser!: string;

  @Column({ type: 'varchar', default: 'streets-v12' })
  mapboxStyleId!: string;

  @Column({ type: 'varchar', nullable: true })
  googleMapsApiKey?: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
