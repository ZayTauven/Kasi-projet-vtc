import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DriverEntity } from "./driver.entity";
import { VEHICLE_TYPE_ENUM_NAME, VehicleType } from "./enums/vehicle-type.enum";

@Entity('car')
export class CarModelEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({name: 'title'})
    name!: string;

    // p2-vehicules (2026-10-20) : moto, taxi/voiture ou camionnette. Filtre
    // la liste des modeles a l'inscription ; null = modele non classe.
    @Column('enum', { enum: VehicleType, enumName: VEHICLE_TYPE_ENUM_NAME, nullable: true })
    vehicleType?: VehicleType | null;

    @OneToMany(() => DriverEntity, driver => driver.car)
    drivers!: DriverEntity[];
}