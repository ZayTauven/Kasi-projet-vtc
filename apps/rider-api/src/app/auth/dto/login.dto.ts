import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType('Login')
export class LoginDTO {
    @Field(() => String)
    jwtToken: string;

    /**
     * `true` quand ce numero vient d'etre enregistre.
     *
     * Le mobile s'en sert pour decider s'il doit lancer l'onboarding (formulaire
     * de nom) ou rejoindre directement la session. Sans cette information, le
     * rider-app envoyait TOUT le monde sur le formulaire de nom, y compris un
     * utilisateur deja inscrit.
     *
     * Decorateurs explicites : `@nestjs/graphql/plugin` deduit deja les champs de
     * ce fichier, mais celui-ci fait partie du contrat mobile — on ne le laisse
     * pas dependre de la configuration du plugin.
     */
    @Field(() => Boolean)
    isNewUser: boolean;
}
