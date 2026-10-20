import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { Point } from "@kasi/database";
import { PackageSize } from "@kasi/database/enums/package-size.enum";

@InputType()
export class CreateOrderInput {
    @Field(() => Int)
    serviceId!: number;
    points!: Point[];
    addresses!: string[];
    @Field(() => Int)
    intervalMinutes!: number;
    twoWay?: boolean;
    optionIds?: string[];
    couponCode?: string;
    /**
     * p2-argent I4 (2026-10-20) : devis renvoye par getFare (champ
     * `quoteId` du service choisi). Ajout facultatif : sans lui, le serveur
     * retrouve le devis affiche (10 min, coupon compris).
     */
    @Field(() => ID, { nullable: true })
    quoteId?: string;
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
}