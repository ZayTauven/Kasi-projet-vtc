import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { SmsProviderEntity } from '../entities/sms-provider.entity';
import { SmsService } from './sms.service';

/**
 * p2-kyc K4 (2026-10-20) : SMS au Kasiman, par le fournisseur par defaut du
 * panel (Orange SMS, Twilio, ou LogOnly qui journalise sans envoyer). Pour ce
 * qui doit arriver meme sans l'app ouverte ni les notifications : documents
 * qui expirent, suspension. N'echoue jamais pour l'appelant : sans numero ni
 * fournisseur par defaut actif, ou si l'envoi echoue, renvoie faux.
 */
@Injectable()
export class KasimanSmsService {
  private readonly logger = new Logger(KasimanSmsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sms: SmsService,
  ) {}

  async send(mobileNumber: string | number | null | undefined, body: string): Promise<boolean> {
    const to = mobileNumber == null ? '' : String(mobileNumber).trim();
    if (to === '') return false;
    const provider = await this.dataSource
      .getRepository(SmsProviderEntity)
      .findOneBy({ isDefault: true, enabled: true });
    if (provider == null) {
      this.logger.warn('SMS non envoye : aucun fournisseur par defaut actif.');
      return false;
    }
    try {
      await this.sms.send(provider, to, body);
      return true;
    } catch (error) {
      this.logger.warn(`SMS non envoye (${provider.type}) : ${(error as Error).message}`);
      return false;
    }
  }
}
