import { Field, Int, ObjectType } from '@nestjs/graphql';

// Aperçu avant création de session : combien de Kasimen seraient payés.
@ObjectType('PayoutSessionPreview')
export class PayoutSessionPreviewDTO {
  @Field(() => Int)
  eligibleCount!: number;
  totalAmount!: number;
  currency!: string;
}
