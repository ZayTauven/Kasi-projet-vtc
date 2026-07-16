import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { CallMaskingProviderEntity } from '@kasi/database/call-masking-provider.entity';
import { CallMaskingService } from '@kasi/order/call-masking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallMaskingProviderDTO } from './dto/call-masking-provider.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CallMaskingProviderResolver {
  constructor(private callMaskingService: CallMaskingService) {}

  @Mutation(() => CallMaskingProviderDTO)
  async setDefaultCallMaskingProvider(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<CallMaskingProviderEntity> {
    return this.callMaskingService.setDefault(Number(id));
  }

  // providerId optionnel EN DERNIER argument (miroir de sendTestSms). Le
  // placement d'un vrai appel Twilio n'est exerçable qu'en mise en service :
  // ici on valide la config du provider et on journalise.
  @Mutation(() => Boolean)
  async testMaskedCall(
    @Args('number') number: string,
    @Args('providerId', { type: () => ID, nullable: true })
    providerId?: number,
  ): Promise<boolean> {
    return this.callMaskingService.testMaskedCall(
      number,
      providerId != null ? Number(providerId) : undefined,
    );
  }
}
