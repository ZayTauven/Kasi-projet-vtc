import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('ProviderWallet')
export class ProviderWalletDTO {
  @IDField(() => ID)
  id: number;
  @FilterableField(() => Float)
  balance: number;
  @FilterableField(() => String)
  currency: string;
}
