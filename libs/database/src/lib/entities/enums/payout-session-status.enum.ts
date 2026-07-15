import { registerEnumType } from "@nestjs/graphql";

export enum PayoutSessionStatus {
    Pending = 'Pending',
    Processed = 'Processed',
    Canceled = 'Canceled'
}

registerEnumType(PayoutSessionStatus, { name: 'PayoutSessionStatus' });
