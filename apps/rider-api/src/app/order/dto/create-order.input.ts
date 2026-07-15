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
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
}