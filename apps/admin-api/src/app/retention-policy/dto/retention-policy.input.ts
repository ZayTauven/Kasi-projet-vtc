import { Field, InputType, Int } from '@nestjs/graphql';

// Sert de Create ET Update DTO (comme SmsProviderInput) pour que le type
// GraphQL s'appelle exactement RetentionPolicyInput.
@InputType()
export class RetentionPolicyInput {
  name!: string;
  enabled?: boolean;
  @Field(() => Int)
  retentionDays!: number;
  // SÉCURITÉ : par défaut true côté entité ; l'omettre conserve la valeur en
  // base lors d'un update partiel nestjs-query.
  dryRun?: boolean;
}
