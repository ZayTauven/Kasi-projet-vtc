import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Point } from "../interfaces/point";
import { TimeMultiplier } from "../interfaces/time-multiplier.dto";
import { PolygonTransformer } from "../transformers/polygon.transformer";
import { TimeMultiplierTransformer } from "../transformers/time-multiplier.transformer";
import { FleetEntity } from "./fleet.entity";
import { ServiceEntity } from "./service.entity";

@Entity('zone_price')
export class ZonePriceEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, transformer: new PolygonTransformer() })
    from!: Point[][];

    @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, transformer: new PolygonTransformer() })
    to!: Point[][];

    @Column('numeric', {
      transformer: new ColumnNumericTransformer(),
      default: '0.00',
        precision: 10,
        scale: 2
    })
    cost!: number;

    @Column('simple-array', {
        nullable: true,
        transformer: new TimeMultiplierTransformer()
    })
    timeMultipliers!: TimeMultiplier[];

    @ManyToMany(() => FleetEntity, fleet => fleet.zonePrices)
    @JoinTable()
    fleets!: FleetEntity[];

    @ManyToMany(() => ServiceEntity, service => service.zonePrices)
    @JoinTable()
    services!: ServiceEntity[];
}