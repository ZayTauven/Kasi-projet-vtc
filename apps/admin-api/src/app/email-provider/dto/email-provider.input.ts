import { InputType } from '@nestjs/graphql';
import { EmailProviderType } from '@kasi/database/enums/email-provider-type.enum';

// Sert de Create ET Update DTO (comme SmsProviderInput) pour que le type
// GraphQL s'appelle exactement EmailProviderInput, contrat attendu du panel.
@InputType()
export class EmailProviderInput {
  type!: EmailProviderType;
  name!: string;
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  // Write-only : le panel l'omet quand il est vide, l'update partiel
  // nestjs-query n'écrase alors pas la valeur en base.
  password?: string;
  fromAddress?: string;
  fromName?: string;
}
