import { ColumnNumericTransformer } from '../transformers/column-numeric.transformer';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DistanceMultiplier } from '../interfaces/distance-multiplier.dto';
import { TimeMultiplier } from '../interfaces/time-multiplier.dto';
import { DistanceMultiplierTransformer } from '../transformers/distance-multiplier.transformer';
import { TimeMultiplierTransformer } from '../transformers/time-multiplier.transformer';
import { CouponEntity } from './coupon.entity';
import { DriverEntity } from './driver.entity';
import { ServiceDistanceFeeMode } from './enums/service-distance-fee-mode.enum';
import { ServiceOrderType } from './enums/service-order-type.enum';
import { ServicePaymentMethod } from './enums/service-payment-method.enum';
import { MediaEntity } from './media.entity';
import { RequestEntity } from './request.entity';
import { RegionEntity } from './region.entity';
import { ServiceCategoryEntity } from './service-category.entity';
import { ServiceOptionEntity } from './service-option.entity';
import { ZonePriceEntity } from './zone-price.entity';
import { WeekdayMultiplierTransformer } from '../transformers/weekday-multiplier.transformer';
import { WeekdayMultiplier } from '../interfaces/weekday-multiplier.dto';
import { DateRangeMultiplierTransformer } from '../transformers/date-range-multiplier.transformer';
import { DateRangeMultiplier } from '../interfaces/date-range-multiplier.dto';

@Entity('service')
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ServiceCategoryEntity, (category) => category.services, {
    onDelete: 'CASCADE',
  })
  category!: ServiceCategoryEntity;

  @Column()
  categoryId!: number;

  @Column({ name: 'title' })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('smallint', { nullable: true })
  personCapacity?: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 12,
    scale: 2,
  })
  baseFare!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 12,
    scale: 2,
  })
  perHundredMeters!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 12,
    scale: 2,
  })
  perMinuteDrive!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 12,
    scale: 2,
  })
  perMinuteWait!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 10,
    scale: 2,
  })
  minimumFee!: number;

  @Column('int', {
    default: 10000,
  })
  searchRadius!: number;

  @Column({
    type: 'enum',
    enum: ServicePaymentMethod,
    default: ServicePaymentMethod.CashCredit,
  })
  paymentMethod!: ServicePaymentMethod;

  @Column('enum', {
    enum: ServiceOrderType,
    default: ServiceOrderType.Ride,
  })
  orderType!: ServiceOrderType;

  @Column('enum', {
    enum: ServiceDistanceFeeMode,
    default: ServiceDistanceFeeMode.PickupToDestination,
  })
  distanceFeeMode!: ServiceDistanceFeeMode;

  @Column('time', {
    default: '00:00',
  })
  availableTimeFrom!: string;

  @Column('time', {
    default: '23:59',
  })
  availableTimeTo!: string;

  @Column('int', { default: 0, name: 'maxDestinationDistance' })
  maximumDestinationDistance!: number;

  @Column('smallint', { default: 0 })
  prepayPercent!: number;

  @Column({ default: false })
  twoWayAvailable!: boolean;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 10,
    scale: 2,
  })
  cancellationTotalFee!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 10,
    scale: 2,
  })
  cancellationDriverShare!: number;

  @Column('smallint', { default: 0 })
  providerSharePercent!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    default: '0.00',
    precision: 10,
    scale: 2,
  })
  providerShareFlat!: number;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    nullable: true,
    precision: 10,
    scale: 2,
  })
  roundingFactor?: number;

  @OneToOne(() => MediaEntity, (media) => media.service)
  @JoinColumn()
  media!: MediaEntity;

  @Column()
  mediaId!: number;

  @Column('simple-array', {
    nullable: true,
    transformer: new TimeMultiplierTransformer(),
  })
  timeMultipliers!: TimeMultiplier[];

  @Column('simple-array', {
    nullable: true,
    transformer: new DistanceMultiplierTransformer(),
  })
  distanceMultipliers!: DistanceMultiplier[];

  @Column('simple-array', {
    nullable: true,
    transformer: new DateRangeMultiplierTransformer(),
  })
  dateRangeMultipliers!: DateRangeMultiplier[];

  @Column('simple-array', {
    nullable: true,
    transformer: new WeekdayMultiplierTransformer(),
  })
  weekdayMultipliers!: WeekdayMultiplier[];

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column('float', { default: 1.0 })
  touristMultiplier!: number;

  @ManyToMany(() => DriverEntity, (driver) => driver.enabledServices)
  drivers!: DriverEntity[];

  @ManyToMany(() => CouponEntity, (coupon) => coupon.allowedServices)
  allowedCoupons!: CouponEntity[];

  @ManyToMany(() => RegionEntity, (region) => region.services)
  @JoinTable()
  regions!: RegionEntity[];

  @OneToMany(() => RequestEntity, (order) => order.service)
  requests!: RequestEntity[];

  @ManyToMany(
    () => ServiceOptionEntity,
    (serviceOption) => serviceOption.services
  )
  @JoinTable()
  options!: ServiceOptionEntity[];

  @ManyToMany(() => ZonePriceEntity, (zonePrice) => zonePrice.fleets)
  zonePrices!: ZonePriceEntity;
}
