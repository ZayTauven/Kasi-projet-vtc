import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { EmailProviderEntity } from '@kasi/database/email-provider.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailProviderDTO } from './dto/email-provider.dto';
import { EmailProviderService } from './email-provider.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class EmailProviderResolver {
  constructor(private emailProviderService: EmailProviderService) {}

  @Mutation(() => EmailProviderDTO)
  async setDefaultEmailProvider(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<EmailProviderEntity> {
    return this.emailProviderService.setDefault(Number(id));
  }

  // providerId optionnel EN DERNIER argument : le panel n'envoie que to par
  // défaut, il peut cibler un provider précis via providerId.
  @Mutation(() => Boolean)
  async sendTestEmail(
    @Args('to') to: string,
    @Args('providerId', { type: () => ID, nullable: true })
    providerId?: number,
  ): Promise<boolean> {
    return this.emailProviderService.sendTestEmail(
      to,
      providerId != null ? Number(providerId) : undefined,
    );
  }
}
