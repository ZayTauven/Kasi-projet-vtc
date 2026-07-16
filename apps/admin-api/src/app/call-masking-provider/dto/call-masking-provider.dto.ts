import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { CallMaskingProviderType } from '@kasi/database/enums/call-masking-provider-type.enum';

// apiSecret ET webhookAuthToken sont volontairement absents de ce DTO de
// lecture : ce sont des secrets write-only (présents uniquement dans
// CallMaskingProviderInput).
@ObjectType('CallMaskingProvider')
export class CallMaskingProviderDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField(() => CallMaskingProviderType)
  type!: CallMaskingProviderType;
  name!: string;
  @FilterableField()
  enabled!: boolean;
  @FilterableField()
  isDefault!: boolean;
  accountId?: string;
  proxyNumber?: string;
  sessionTtlMinutes!: number;
  createdAt!: Date;
}
