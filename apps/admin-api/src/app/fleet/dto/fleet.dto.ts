import {
  Authorize,
  CursorConnection,
  FilterableField,
  IDField,
  OffsetConnection,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { ZonePriceDTO } from '../../service/dto/zone-price.dto';
import { FleetTransactionDTO } from './fleet-transaction.dto';
import { FleetWalletDTO } from './fleet-wallet.dto';
import { FleetAuthorizer } from './fleet.authorizer';

@ObjectType('Fleet')
@UnPagedRelation('wallet', () => FleetWalletDTO, { relationName: 'wallet' })
@OffsetConnection('transactions', () => FleetTransactionDTO)
@OffsetConnection('zonePrices', () => ZonePriceDTO)
@Authorize(FleetAuthorizer)
export class FleetDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  name!: string;
  phoneNumber: string;
  mobileNumber: string;
  accountNumber: string;
  commissionSharePercent!: number;
  commissionShareFlat!: number;
  feeMultiplier?: number;
  address?: string;
  exclusivityAreas?: Point[][];
}
