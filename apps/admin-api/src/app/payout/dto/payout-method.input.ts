import { InputType } from '@nestjs/graphql';
import { PayoutMethodType } from '@kasi/database/enums/payout-method-type.enum';

@InputType()
export class PayoutMethodInput {
  type!: PayoutMethodType;
  name!: string;
  currency!: string;
  enabled?: boolean;
  minimumAmount?: number;
  instructions?: string;
}
