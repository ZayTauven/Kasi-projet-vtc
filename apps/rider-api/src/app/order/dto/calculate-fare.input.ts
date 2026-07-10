import { InputType } from "@nestjs/graphql";
import { Point } from "@kasi/database";

@InputType()
export class CalculateFareInput {
    points!: Point[];
    twoWay?: boolean;
    couponCode?: string;
    selectedOptionIds?: string[];
}