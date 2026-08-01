import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { hashPassword, isPasswordHashed } from '../auth/password';

import { ComplaintActivityEntity } from './complaint-activity.entity';
import { DriverTransactionEntity } from './driver-transaction.entity';
import { EnabledNotification } from './enums/enabled-notification.enum';
import { FleetTransactionEntity } from './fleet-transaction.entity';
import { FleetEntity } from './fleet.entity';
import { MediaEntity } from './media.entity';
import { OperatorRoleEntity } from './operator-role.entity';
import { ProviderTransactionEntity } from './provider-transaction.entity';
import { RequestEntity } from './request.entity';
import { RiderTransactionEntity } from './rider-transaction.entity';
import { SOSActivityEntity } from './sos-activity.entity';

@Entity('operator')
export class OperatorEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ unique: true })
  userName!: string;

  @Column({ default: 'admin' })
  password!: string;

  @Column('bigint', {
    nullable: true,
    unique: true,
  })
  mobileNumber?: string;

  @Column({
    type: 'enum',
    enum: EnabledNotification,
    array: true,
    default: [
      EnabledNotification.Complaint,
      EnabledNotification.SOS,
      EnabledNotification.DriverSubmittedDocs,
    ],
  })
  enabledNotifications!: EnabledNotification[];

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @OneToOne(() => MediaEntity, (media) => media.operator)
  @JoinColumn()
  media?: MediaEntity;

  @Column({ nullable: true })
  mediaId?: number;

  @ManyToOne(() => OperatorRoleEntity, (role) => role.operators)
  role?: OperatorRoleEntity;

  @Column({ nullable: true })
  roleId?: number;

  @ManyToOne(() => FleetEntity, (fleet) => fleet.operators)
  fleet?: FleetEntity;

  @OneToMany(() => RequestEntity, (request) => request.operator, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  requests!: RequestEntity[];

  @OneToMany(() => ComplaintActivityEntity, (activity) => activity.actor)
  complaintActivities!: ComplaintActivityEntity[];

  @OneToMany(
    () => RiderTransactionEntity,
    (riderTransaction) => riderTransaction.operator
  )
  riderTransactions!: RiderTransactionEntity[];

  @OneToMany(
    () => DriverTransactionEntity,
    (driverTransaction) => driverTransaction.operator
  )
  driverTransactions!: DriverTransactionEntity[];

  @OneToMany(
    () => FleetTransactionEntity,
    (fleetTransaction) => fleetTransaction.operator
  )
  fleetTransactions!: FleetTransactionEntity[];

  @OneToMany(
    () => ProviderTransactionEntity,
    (providerTransaction) => providerTransaction.operator
  )
  providerTransactions!: ProviderTransactionEntity[];

  @OneToMany(() => SOSActivityEntity, (sosActivity) => sosActivity.operator)
  sosActivities!: SOSActivityEntity[];

  /**
   * Filet de securite couvrant la mutation `createOneOperator` generee par
   * nestjs-query : elle passe par `repo.save()`, donc par ce hook, et son
   * `CreateOperatorInput` accepte un mot de passe en clair.
   *
   * A NOTER : TypeORM ne declenche PAS les hooks d'entite sur `repo.update()`.
   * Tout chemin utilisant `update()` doit hacher explicitement — c'est le cas
   * de la mutation `updatePassword` (OperatorResolver).
   */
  @BeforeInsert()
  async hashPasswordBeforeInsert(): Promise<void> {
    if (this.password && !isPasswordHashed(this.password)) {
      this.password = await hashPassword(this.password);
    }
  }
}
