import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SmsProviderEntity } from '@kasi/database/sms-provider.entity';
import { SmsService } from './sms.service';

@Injectable()
export class SmsProviderService {
  constructor(
    @InjectRepository(SmsProviderEntity)
    private providerRepo: Repository<SmsProviderEntity>,
    private smsService: SmsService,
  ) {}

  // Un seul provider par défaut à la fois : bascule transactionnelle
  // (isDefault=false partout ailleurs, true + enabled=true sur la cible).
  async setDefault(id: number): Promise<SmsProviderEntity> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (provider == null) {
      throw new Error('SMS_PROVIDER_NOT_FOUND');
    }
    await this.providerRepo.manager.transaction(async (manager) => {
      await manager.update(
        SmsProviderEntity,
        { id: Not(id) },
        { isDefault: false },
      );
      await manager.update(
        SmsProviderEntity,
        { id },
        { isDefault: true, enabled: true },
      );
    });
    return this.providerRepo.findOneByOrFail({ id });
  }

  // providerId fourni -> ce provider ; sinon le provider par défaut activé.
  // Le SMS de test utilise le verificationTemplate avec un code factice.
  async sendTestSms(number: string, providerId?: number): Promise<boolean> {
    let provider: SmsProviderEntity | null;
    if (providerId != null) {
      provider = await this.providerRepo.findOneBy({ id: providerId });
      if (provider == null) {
        throw new Error('SMS_PROVIDER_NOT_FOUND');
      }
      if (!provider.enabled) {
        throw new Error('SMS_PROVIDER_DISABLED');
      }
    } else {
      provider = await this.providerRepo.findOneBy({
        isDefault: true,
        enabled: true,
      });
      if (provider == null) {
        throw new Error('NO_DEFAULT_SMS_PROVIDER');
      }
    }
    const body = provider.verificationTemplate.replace(/%code%/g, '123456');
    await this.smsService.send(provider, number, body);
    return true;
  }
}
