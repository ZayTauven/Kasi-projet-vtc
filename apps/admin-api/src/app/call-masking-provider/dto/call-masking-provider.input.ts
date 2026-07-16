import { InputType } from '@nestjs/graphql';
import { CallMaskingProviderType } from '@kasi/database/enums/call-masking-provider-type.enum';

// Sert de Create ET Update DTO (comme SmsProviderInput) pour que le type
// GraphQL s'appelle exactement CallMaskingProviderInput, contrat du panel.
@InputType()
export class CallMaskingProviderInput {
  type!: CallMaskingProviderType;
  name!: string;
  enabled?: boolean;
  // SID de compte Twilio.
  accountId?: string;
  // Write-only : le panel l'omet quand il est vide, l'update partiel
  // nestjs-query n'écrase alors pas la valeur en base.
  apiSecret?: string;
  // Numéro proxy Twilio (E.164).
  proxyNumber?: string;
  // Write-only (auth token Twilio pour valider la signature du webhook voix).
  webhookAuthToken?: string;
  sessionTtlMinutes?: number;
}
