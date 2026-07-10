import {
  FilterableField,
  IDField,
  Relation,
} from '@ptc-org/nestjs-query-graphql';
import { Float, ID, ObjectType } from '@nestjs/graphql';
import { RiderDTO } from './rider.dto';

@ObjectType('RiderWallet')
@Relation('rider', () => RiderDTO, { nullable: true })
export class RiderWalletDTO {
  @IDField(() => ID)
  id: number;
  @FilterableField(() => Float)
  balance: number;
  currency: string;
  @FilterableField(() => ID)
  riderId?: number;
}
