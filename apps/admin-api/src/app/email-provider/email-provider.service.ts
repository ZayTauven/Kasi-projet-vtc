import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { EmailProviderEntity } from '@kasi/database/email-provider.entity';
import { EmailService } from './email.service';

@Injectable()
export class EmailProviderService {
  constructor(
    @InjectRepository(EmailProviderEntity)
    private providerRepo: Repository<EmailProviderEntity>,
    private emailService: EmailService,
  ) {}

  // Un seul provider par défaut à la fois : bascule transactionnelle
  // (isDefault=false partout ailleurs, true + enabled=true sur la cible).
  async setDefault(id: number): Promise<EmailProviderEntity> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (provider == null) {
      throw new Error('EMAIL_PROVIDER_NOT_FOUND');
    }
    await this.providerRepo.manager.transaction(async (manager) => {
      await manager.update(
        EmailProviderEntity,
        { id: Not(id) },
        { isDefault: false },
      );
      await manager.update(
        EmailProviderEntity,
        { id },
        { isDefault: true, enabled: true },
      );
    });
    return this.providerRepo.findOneByOrFail({ id });
  }

  // providerId fourni -> ce provider ; sinon le provider par défaut activé.
  async sendTestEmail(to: string, providerId?: number): Promise<boolean> {
    let provider: EmailProviderEntity | null;
    if (providerId != null) {
      provider = await this.providerRepo.findOneBy({ id: providerId });
      if (provider == null) {
        throw new Error('EMAIL_PROVIDER_NOT_FOUND');
      }
      if (!provider.enabled) {
        throw new Error('EMAIL_PROVIDER_DISABLED');
      }
    } else {
      provider = await this.providerRepo.findOneBy({
        isDefault: true,
        enabled: true,
      });
      if (provider == null) {
        throw new Error('NO_DEFAULT_EMAIL_PROVIDER');
      }
    }
    await this.emailService.send(
      provider,
      to,
      'Kasi — Test email',
      'Ceci est un email de test Kasi.',
    );
    return true;
  }
}
