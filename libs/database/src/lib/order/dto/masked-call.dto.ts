import { Field, ObjectType } from '@nestjs/graphql';

// Résultat d'une demande d'appel masqué, partagé par rider-api ET driver-api.
// proxyNumber = numéro à composer (le vrai numéro de l'autre partie en mode
// Direct ; le numéro proxy Twilio en mode TwilioVoice).
// expiresAt = null en mode Direct (pas de session), sinon fin de validité de la
// session de masquage. Le scalaire date suit le dateScalarMode de chaque app
// (les 2 APIs sont en 'timestamp').
@ObjectType('MaskedCallDTO')
export class MaskedCallDTO {
  @Field()
  proxyNumber!: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;
}
