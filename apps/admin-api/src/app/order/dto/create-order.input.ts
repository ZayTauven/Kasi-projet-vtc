import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { Point } from "@kasi/database";
import { PackageSize } from "@kasi/database/enums/package-size.enum";

@InputType()
export class CreateOrderInput {
    @Field(() => ID)
    riderId: number;
    @Field(() => ID)
    serviceId!: number;
    points!: Point[];
    addresses!: string[];
    @Field(() => Int)
    intervalMinutes!: number;
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
}