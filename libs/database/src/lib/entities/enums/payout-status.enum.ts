import { registerEnumType } from "@nestjs/graphql";

export enum PayoutStatus {
    Pending = 'Pending',
    Paid = 'Paid',
    Canceled = 'Canceled'
}

registerEnumType(PayoutStatus, { name: 'PayoutStatus' });
