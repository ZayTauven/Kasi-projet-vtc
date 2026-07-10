import { InputType } from '@nestjs/graphql';
import { ServiceOptionIcon } from '@kasi/database/enums/service-option-icon.enum';
import { ServiceOptionType } from '@kasi/database/enums/service-option-type.enum';

@InputType()
export class ServiceOptionInput {
  name: string;
  type: ServiceOptionType;
  additionalFee?: number;
  icon: ServiceOptionIcon;
}
