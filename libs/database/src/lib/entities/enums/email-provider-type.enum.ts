import { registerEnumType } from "@nestjs/graphql";

// Canaux d'envoi d'email (chantier P6.2). Les valeurs sérialisées sont
// contractuelles : le panel construit ses clés i18n à partir d'elles.
// LogOnly = mode dev/E2E (l'email est simplement journalisé côté API).
// Smtp = envoi générique via nodemailer (décision : pas d'API tierce).
export enum EmailProviderType {
    LogOnly = 'LogOnly',
    Smtp = 'Smtp'
}

registerEnumType(EmailProviderType, { name: 'EmailProviderType' });
