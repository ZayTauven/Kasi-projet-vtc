import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { DriverDocumentStatus } from '@kasi/database/driver-document.entity';

import { MediaDTO } from '../../upload/media.dto';

registerEnumType(DriverDocumentStatus, { name: 'DriverDocumentStatus' });

/** p2-kyc K1 (2026-10-20) : panel seulement, ajouts purs (fiche KYC §4). */
@ObjectType('DriverDocumentType')
export class DriverDocumentTypeDTO {
  @Field(() => ID)
  id!: number;

  @Field()
  code!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field()
  isEnabled!: boolean;

  @Field()
  isRequired!: boolean;

  @Field()
  hasExpiryDate!: boolean;

  @Field(() => [Int])
  reminderDays!: number[];

  @Field(() => Int)
  sortOrder!: number;

  /** p2-kyc K4 : vehicules pour lesquels il est exige (vide = tous). */
  @Field(() => [VehicleType])
  vehicleTypes!: VehicleType[];
}

@ObjectType('DriverDocument')
export class DriverDocumentDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  driverId!: number;

  @Field(() => ID)
  typeId!: number;

  @Field(() => DriverDocumentTypeDTO)
  type!: DriverDocumentTypeDTO;

  @Field(() => ID, { nullable: true })
  mediaId?: number | null;

  @Field(() => MediaDTO, { nullable: true })
  media?: MediaDTO | null;

  @Field(() => String, { nullable: true })
  number?: string | null;

  /** `YYYY-MM-DD`, valable jusqu'a ce jour inclus. */
  @Field(() => String, { nullable: true })
  expiresAt?: string | null;

  @Field(() => DriverDocumentStatus)
  status!: DriverDocumentStatus;

  @Field(() => String, { nullable: true })
  reviewNote?: string | null;

  @Field(() => Date, { nullable: true })
  reviewedAt?: Date | null;

  @Field(() => ID, { nullable: true })
  reviewedByOperatorId?: number | null;

  @Field()
  createdAt!: Date;
}

@ObjectType('DriverDocumentReview')
export class DriverDocumentReviewDTO {
  @Field(() => DriverDocumentDTO)
  document!: DriverDocumentDTO;

  /** Le Kasiman suspendu pour document expire a ete remis hors ligne. */
  @Field()
  reinstated!: boolean;
}

@ObjectType('ExpiringDriverDocument')
export class ExpiringDriverDocumentDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  driverId!: number;

  @Field(() => String, { nullable: true })
  driverName?: string | null;

  @Field(() => ID)
  typeId!: number;

  @Field()
  title!: string;

  @Field()
  expiresAt!: string;

  @Field(() => Int)
  daysLeft!: number;
}

@InputType()
export class DriverDocumentTypeInput {
  @Field({ nullable: true })
  code?: string;

  @Field({ nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field({ nullable: true })
  isEnabled?: boolean;

  @Field({ nullable: true })
  isRequired?: boolean;

  @Field({ nullable: true })
  hasExpiryDate?: boolean;

  @Field(() => [Int], { nullable: true })
  reminderDays?: number[];

  @Field(() => Int, { nullable: true })
  sortOrder?: number;

  /** p2-kyc K4 : vide = tous les vehicules. */
  @Field(() => [VehicleType], { nullable: true })
  vehicleTypes?: VehicleType[];
}

@InputType()
export class CreateDriverDocumentInput {
  @Field(() => ID)
  driverId!: number;

  @Field(() => ID)
  typeId!: number;

  /** Fichier deja envoye par le Kasiman (`documents`) ou televerse par le panel. */
  @Field(() => ID, { nullable: true })
  mediaId?: number | null;

  @Field(() => String, { nullable: true })
  number?: string | null;

  @Field(() => String, { nullable: true })
  expiresAt?: string | null;
}
