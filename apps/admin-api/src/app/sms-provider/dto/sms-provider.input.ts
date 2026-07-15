import { InputType } from '@nestjs/graphql';
import { SmsProviderType } from '@kasi/database/enums/sms-provider-type.enum';

// Sert de Create ET Update DTO (comme PayoutMethodInput) pour que le type
// GraphQL s'appelle exactement SmsProviderInput, contrat attendu du panel.
@InputType()
export class SmsProviderInput {
  type!: SmsProviderType;
  name!: string;
  enabled?: boolean;
  // SID Twilio / client_id Orange Developer.
  accountId?: string;
  // Write-only : le panel l'omet quand il est vide, l'update partiel
  // nestjs-query n'écrase alors pas la valeur en base.
  apiSecret?: string;
  senderId?: string;
  verificationTemplate?: string;
}
