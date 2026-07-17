import { FilterableField, IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { EmailProviderType } from '@kasi/database/enums/email-provider-type.enum';

// password est volontairement absent de ce DTO de lecture : le secret est
// write-only (présent uniquement dans EmailProviderInput).
@ObjectType('EmailProvider')
export class EmailProviderDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField(() => EmailProviderType)
  type!: EmailProviderType;
  name!: string;
  @FilterableField()
  enabled!: boolean;
  @FilterableField()
  isDefault!: boolean;
  host?: string;
  port?: number;
  secure!: boolean;
  username?: string;
  fromAddress?: string;
  fromName?: string;
  createdAt!: Date;
}
