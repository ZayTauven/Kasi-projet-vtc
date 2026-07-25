import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType('Login')
export class LoginDTO {
    @Field(() => String)
    jwtToken: string;

    /**
     * `true` quand ce numero vient d'etre enregistre.
     *
     * Le mobile s'en sert pour distinguer une premiere inscription d'une simple
     * reconnexion, au lieu de deduire l'etat depuis un statut de driver charge
     * plus tard.
     *
     * Decorateurs explicites : `@nestjs/graphql/plugin` deduit deja les champs de
     * ce fichier, mais celui-ci fait partie du contrat mobile — on ne le laisse
     * pas dependre de la configuration du plugin.
     */
    @Field(() => Boolean)
    isNewUser: boolean;
}
