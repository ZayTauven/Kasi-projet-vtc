import { Field, InputType, Int } from "@nestjs/graphql";
import { Point } from "@kasi/database";

@InputType()
export class CalculateFareInput {
    points!: Point[];
    twoWay?: boolean;
    couponCode?: string;
    selectedOptionIds?: string[];
    /**
     * p2-argent I4 (2026-10-20) : prise en charge dans N minutes (reservation),
     * pour chiffrer a l'heure prevue. Ajout facultatif ; absent = maintenant.
     */
    @Field(() => Int, { nullable: true })
    intervalMinutes?: number;
}