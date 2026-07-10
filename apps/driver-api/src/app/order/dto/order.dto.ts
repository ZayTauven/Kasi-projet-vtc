import {
  Authorize,
  FilterableField,
  IDField,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { UserContext } from '../../auth/authenticated-user';
import { RiderDTO } from './rider.dto';
import { ServiceDTO } from '../../service/dto/service.dto';
import { OrderMessageDTO } from '../../chat/dto/order-message.dto';
import { DriverDTO } from '../../driver/dto/driver.dto';
import { ServiceOptionDTO } from './service-option.dto';

@ObjectType('Order')
@Authorize({
  authorize: (context: UserContext) =>
    ({ driverId: { eq: context.req.user.id } }) as unknown,
})
@Relation('driver', () => DriverDTO, {
  nullable: true,
})
@Relation('rider', () => RiderDTO, {
  nullable: true,
})
@Relation('service', () => ServiceDTO, {
  nullable: true,
})
@UnPagedRelation('options', () => ServiceOptionDTO)
@UnPagedRelation('conversation', () => OrderMessageDTO, {
  relationName: 'conversation'})
export class OrderDTO {
  @IDField(() => ID)
  id: number;
  @FilterableField(() => OrderStatus)
  status: OrderStatus;
  @FilterableField()
  createdOn: Date;
  @FilterableField(() => Int)
  distanceBest!: number;
  @Field(() => Int)
  durationBest!: number;
  startTimestamp?: Date;
  finishTimestamp?: Date;
  etaPickup?: Date;
  waitMinutes!: number;
  @Field(() => Int)
  destinationArrivedTo!: number;
  driverLastSeenMessagesAt!: Date;
  riderLastSeenMessagesAt!: Date;
  expectedTimestamp: Date;
  @FilterableField()
  costBest: number;
  costAfterCoupon: number;
  providerShare: number;
  paidAmount: number;
  currency!: string;
  @FilterableField(() => ID, { filterOnly: true })
  driverId?: number;
  addresses: string[];
  points: Point[];
  tipAmount!: number;
  paymentGatewayId?: number;
  directions?: Point[];
}
