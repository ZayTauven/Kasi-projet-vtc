import { registerEnumType } from "@nestjs/graphql";

// Canaux d'envoi de SMS (chantier P3). Les valeurs sérialisées sont
// contractuelles : le panel construit ses clés i18n à partir d'elles.
// LogOnly = mode dev/E2E (le SMS est simplement journalisé côté API).
export enum SmsProviderType {
    LogOnly = 'LogOnly',
    Twilio = 'Twilio',
    OrangeSms = 'OrangeSms'
}

registerEnumType(SmsProviderType, { name: 'SmsProviderType' });
