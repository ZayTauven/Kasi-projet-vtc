import { registerEnumType } from "@nestjs/graphql";

// Fournisseurs d'appels masqués / call masking (chantier P3, moitié voix).
// Les valeurs sérialisées sont contractuelles : le panel construit ses clés
// i18n à partir d'elles (miroir de SmsProviderType).
// Direct = mode dev/E2E local : aucun Twilio ni webhook, on renvoie le vrai
// numéro de l'autre partie (le masquage est neutralisé, pratique en local).
// TwilioVoice = masquage réel via un numéro proxy Twilio + webhook voix.
// Valeurs futures RÉSERVÉES (ne pas coder ici) : AfricasTalking, Sip.
export enum CallMaskingProviderType {
    Direct = 'Direct',
    TwilioVoice = 'TwilioVoice'
}

registerEnumType(CallMaskingProviderType, { name: 'CallMaskingProviderType' });
