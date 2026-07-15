import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { SmsProviderEntity } from '@kasi/database/sms-provider.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmsProviderDTO } from './dto/sms-provider.dto';
import { SmsProviderService } from './sms-provider.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class SmsProviderResolver {
  constructor(private smsProviderService: SmsProviderService) {}

  @Mutation(() => SmsProviderDTO)
  async setDefaultSmsProvider(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<SmsProviderEntity> {
    return this.smsProviderService.setDefault(Number(id));
  }

  // providerId optionnel EN DERNIER argument : le panel actuel n'envoie que
  // number (il sera patché ensuite en session principale pour cibler un
  // provider précis).
  @Mutation(() => Boolean)
  async sendTestSms(
    @Args('number') number: string,
    @Args('providerId', { type: () => ID, nullable: true })
    providerId?: number,
  ): Promise<boolean> {
    return this.smsProviderService.sendTestSms(
      number,
      providerId != null ? Number(providerId) : undefined,
    );
  }
}
