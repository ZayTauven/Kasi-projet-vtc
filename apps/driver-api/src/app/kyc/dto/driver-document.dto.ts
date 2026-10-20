import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { DriverDocumentStatus } from '@kasi/database/driver-document.entity';

import { MediaDTO } from '../../upload/media.dto';

registerEnumType(DriverDocumentStatus, { name: 'DriverDocumentStatus' });

/**
 * p2-kyc K1 (2026-10-20) : contrat mobile, AJOUTS seulement
 * (docs/fiche-kyc.md §4). Rien de renomme ni retire : `documents`,
 * `upload_document` et `setDocumentsOnDriver` restent tels quels.
 */
@ObjectType('DriverDocumentType')
export class DriverDocumentTypeDTO {
  @Field(() => ID)
  id!: number;

  /** Code stable : driving_license, vehicle_registration, insurance... */
  @Field()
  code!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field()
  isRequired!: boolean;

  /** Une date d'expiration est exigee a l'envoi. */
  @Field()
  hasExpiryDate!: boolean;

  /** p2-kyc K4 : vehicules pour lesquels il est exige (vide = tous). */
  @Field(() => [VehicleType])
  vehicleTypes!: VehicleType[];
}

@ObjectType('DriverDocument')
export class DriverDocumentDTO {
  @Field(() => ID)
  id!: number;

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

  /** Motif d'un refus. */
  @Field(() => String, { nullable: true })
  reviewNote?: string | null;

  @Field()
  createdAt!: Date;
}

@InputType()
export class SubmitDriverDocumentInput {
  @Field(() => ID)
  typeId!: number;

  /** Identifiant renvoye par `POST /upload_document`. */
  @Field(() => ID)
  mediaId!: number;

  @Field(() => String, { nullable: true })
  number?: string | null;

  /** `YYYY-MM-DD`. Exigee si le type a une date d'expiration. */
  @Field(() => String, { nullable: true })
  expiresAt?: string | null;
}
