import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PayoutMethodType } from '@kasi/database/enums/payout-method-type.enum';
import { PayoutStatus } from '@kasi/database/enums/payout-status.enum';

// Méthodes de retrait proposées au Kasiman (écran « Méthodes de retrait »).
@ObjectType('PayoutMethod')
export class PayoutMethodDTO {
  @Field(() => ID)
  id!: number;
  type!: PayoutMethodType;
  name!: string;
  currency!: string;
  minimumAmount!: number;
  instructions?: string;
}

// Historique des versements reçus par le Kasiman.
@ObjectType('Payout')
export class DriverPayoutDTO {
  @Field(() => ID)
  id!: number;
  createdAt!: Date;
  status!: PayoutStatus;
  amount!: number;
  currency!: string;
  methodType!: PayoutMethodType;
  methodName!: string;
  accountNumber?: string;
  processedAt?: Date;
}
