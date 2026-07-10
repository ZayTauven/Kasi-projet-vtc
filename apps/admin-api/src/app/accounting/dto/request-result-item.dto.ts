import { ObjectType } from '@nestjs/graphql';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';

@ObjectType()
export class RequestResultItem {
  time: string;
  count: number;
  status: OrderStatus;
}
