import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * p2-dispatch D6 (2026-10-20) : demande non servie (course passee en « aucun
 * Kasiman » apres les vagues), avec son point de depart. Ajout pur, panel
 * seulement. La carte des zones de forte demande releve de `p4-pilotage`.
 */
@ObjectType('UnservedDemand')
export class UnservedDemandDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  requestId!: number;

  @Field(() => ID)
  serviceId!: number;

  @Field(() => Float)
  lat!: number;

  @Field(() => Float)
  lng!: number;

  @Field(() => Int)
  driversSolicited!: number;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  alertedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  alertedDrivers?: number | null;
}
