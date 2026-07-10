import { InputType } from '@nestjs/graphql';
import { PaymentGatewayType } from '@kasi/database/enums/payment-gateway-type.enum';

@InputType()
export class PaymentGatewayInput {
  enabled!: boolean;
  title!: string;
  type!: PaymentGatewayType;
  publicKey?: string;
  privateKey: string;
  merchantId?: string;
  saltKey?: string;
  mediaId?: number;
}
