import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OperatorPermission } from "./enums/operator-permission.enum";
import { OperatorEntity } from "./operator.entity";

@Entity('operator_role')
export class OperatorRoleEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    title!: string;

    @Column({
        type: 'enum',
        enum: OperatorPermission,
        array: true,
    })
    permissions!: OperatorPermission[];

    @OneToMany(() => OperatorEntity, operator => operator.role)
    operators!: OperatorEntity[];

}