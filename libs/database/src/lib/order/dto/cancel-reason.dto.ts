import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * p3-mesures M4 (2026-10-22) : motif d'annulation propose aux apps (rider-api :
 * motifs client ; driver-api : motifs Kasiman). Sans `userType` : pas
 * d'enumeration nouvelle pour les apps installees (contrat mobile).
 */
@ObjectType('CancelReason')
export class CancelReasonDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => String)
  title!: string;
}
