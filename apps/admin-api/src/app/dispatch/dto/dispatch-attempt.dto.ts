import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DispatchAttemptOutcome } from '@kasi/database/dispatch-attempt.entity';

registerEnumType(DispatchAttemptOutcome, { name: 'DispatchAttemptOutcome' });

/**
 * p2-dispatch D4 (2026-10-20) : une sollicitation du dispatch par vagues
 * (fiche de la course, panel). Ajout pur, lu par aucune app mobile.
 */
@ObjectType('DispatchAttempt')
export class DispatchAttemptDTO {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  requestId!: number;

  @Field(() => ID)
  driverId!: number;

  @Field(() => String, { nullable: true })
  driverName?: string | null;

  @Field(() => Int)
  wave!: number;

  @Field(() => Int)
  rank!: number;

  @Field(() => Int)
  airDistanceM!: number;

  @Field(() => Int, { nullable: true })
  roadDistanceM?: number | null;

  @Field(() => Int, { nullable: true })
  roadDurationS?: number | null;

  @Field(() => String, { nullable: true })
  routingSource?: string | null;

  @Field(() => DispatchAttemptOutcome)
  outcome!: DispatchAttemptOutcome;

  @Field()
  offeredAt!: Date;

  @Field({ nullable: true })
  respondedAt?: Date | null;
}
