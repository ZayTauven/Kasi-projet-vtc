import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreatePayoutSessionInput {
  currency!: string;
  // Plancher de solde propre à la session, combiné au minimum de chaque
  // méthode (le plus élevé des deux s'applique).
  minimumAmount?: number;
  description?: string;
  // Restreint la session à certaines méthodes de retrait ; vide = toutes.
  @Field(() => [ID], { nullable: true })
  methodIds?: number[];
}
