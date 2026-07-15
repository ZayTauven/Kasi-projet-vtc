import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { PackageSize } from '@kasi/database/enums/package-size.enum';

@ObjectType('AvailableOrder')
export class AvailableOrderDTO {
    id: number;
    createdOn: Date;
    startTimestamp?: Date;
    finishTimestamp?: Date;
    etaPickup?: Date;
    status: OrderStatus;
    expectedTimestamp: Date;
    costBest: number;
    @Field(() => Int)
    distanceBest: number;
    @Field(() => Int)
    durationBest: number;
    currency!: string;
    driverId?: number;
    addresses: string[];
    points: Point[];
    packageSize?: PackageSize;
    recipientName?: string;
    recipientMobileNumber?: string;
    deliveryInstructions?: string;
}