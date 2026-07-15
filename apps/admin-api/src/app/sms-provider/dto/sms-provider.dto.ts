import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { SmsProviderType } from '@kasi/database/enums/sms-provider-type.enum';

// apiSecret est volontairement absent de ce DTO de lecture : le secret est
// write-only (présent uniquement dans SmsProviderInput).
@ObjectType('SmsProvider')
export class SmsProviderDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField(() => SmsProviderType)
  type!: SmsProviderType;
  name!: string;
  @FilterableField()
  enabled!: boolean;
  @FilterableField()
  isDefault!: boolean;
  accountId?: string;
  senderId?: string;
  verificationTemplate!: string;
  createdAt!: Date;
}
