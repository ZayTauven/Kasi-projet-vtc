import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { Not, Repository } from 'typeorm';
import { CallMaskingProviderType } from '@kasi/database/enums/call-masking-provider-type.enum';
import { CallMaskingProviderEntity } from '@kasi/database/call-masking-provider.entity';
import { RequestEntity } from '@kasi/database/request.entity';

// Session de masquage stockée en Redis (clé callmask:session:{proxy}:{caller}).
interface MaskedCallSession {
  targetMsisdn: string;
  orderId: number;
  expiresAt: string | null;
}

// Résultat interne de requestMaskedCall (le DTO GraphQL vit côté apps).
export interface MaskedCallResult {
  proxyNumber: string;
  expiresAt: Date | null;
}

// Résultat PROVIDER-AGNOSTIQUE d'un appel entrant : le rendu TwiML est fait
// côté contrôleur/webhook, pas ici, pour rester indépendant de Twilio.
export type IncomingCallResolution =
  | { action: 'dial'; target: string }
  | { action: 'reject' };

// Service voix partagé (call masking). Vit dans libs/order car consommé par
// rider-api ET driver-api. Découplé du transport (Redis + repository), à l'image
// de SmsService/SmsProviderService côté SMS.
@Injectable()
export class CallMaskingService {
  private readonly logger = new Logger(CallMaskingService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(CallMaskingProviderEntity)
    private readonly providerRepo: Repository<CallMaskingProviderEntity>,
  ) {}

  private sessionKey(proxyNumber: string, callerMsisdn: string): string {
    return `callmask:session:${proxyNumber}:${callerMsisdn}`;
  }

  private orderIndexKey(orderId: number): string {
    return `callmask:order:${orderId}`;
  }

  // Provider par défaut ACTIVÉ, ou null. Sert au webhook (webhookAuthToken) et
  // à requestMaskedCall.
  async getDefaultProvider(): Promise<CallMaskingProviderEntity | null> {
    return this.providerRepo.findOneBy({ isDefault: true, enabled: true });
  }

  // Un participant demande un numéro pour joindre l'autre partie.
  async requestMaskedCall({
    order,
    callerMsisdn,
    targetMsisdn,
  }: {
    order: RequestEntity;
    callerMsisdn: string;
    targetMsisdn: string;
  }): Promise<MaskedCallResult> {
    const provider = await this.getDefaultProvider();
    if (provider == null) {
      throw new Error('NO_DEFAULT_CALL_MASKING_PROVIDER');
    }
    switch (provider.type) {
      case CallMaskingProviderType.Direct: {
        // Mode dev/E2E local : aucun Twilio ni webhook, on renvoie le vrai
        // numéro de l'autre partie (le masquage est neutralisé).
        this.logger.log(
          `[CallMasking Direct] order=${order.id} caller=${callerMsisdn} -> target=${targetMsisdn}`,
        );
        return { proxyNumber: targetMsisdn, expiresAt: null };
      }
      case CallMaskingProviderType.TwilioVoice: {
        const proxyNumber = provider.proxyNumber;
        if (proxyNumber == null || proxyNumber === '') {
          throw new Error('CALL_MASKING_PROVIDER_MISCONFIGURED');
        }
        const ttlSeconds = Math.max(1, provider.sessionTtlMinutes) * 60;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        const key = this.sessionKey(proxyNumber, callerMsisdn);
        const session: MaskedCallSession = {
          targetMsisdn,
          orderId: order.id,
          expiresAt: expiresAt.toISOString(),
        };
        await this.redis.set(key, JSON.stringify(session), 'EX', ttlSeconds);
        // Index par course pour une purge O(1) à la fin de la course.
        const indexKey = this.orderIndexKey(order.id);
        await this.redis.sadd(indexKey, key);
        await this.redis.expire(indexKey, ttlSeconds);
        return { proxyNumber, expiresAt };
      }
      default:
        throw new Error(
          `CALL_MASKING_PROVIDER_TYPE_NOT_SUPPORTED: ${provider.type}`,
        );
    }
  }

  // Résout un appel entrant sur le numéro proxy (webhook voix). Provider-agnostique.
  async resolveIncoming({
    proxyNumber,
    from,
  }: {
    proxyNumber: string;
    from: string;
  }): Promise<IncomingCallResolution> {
    const key = this.sessionKey(proxyNumber, from);
    const raw = await this.redis.get(key);
    if (raw == null) {
      return { action: 'reject' };
    }
    let session: MaskedCallSession;
    try {
      session = JSON.parse(raw) as MaskedCallSession;
    } catch {
      return { action: 'reject' };
    }
    if (
      session.expiresAt != null &&
      new Date(session.expiresAt).getTime() < Date.now()
    ) {
      return { action: 'reject' };
    }
    if (session.targetMsisdn == null || session.targetMsisdn === '') {
      return { action: 'reject' };
    }
    return { action: 'dial', target: session.targetMsisdn };
  }

  // Purge les sessions Redis d'une course terminée (via l'index par course).
  async endSession(orderId: number): Promise<void> {
    const indexKey = this.orderIndexKey(orderId);
    const keys = await this.redis.smembers(indexKey);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    await this.redis.del(indexKey);
  }

  // Bascule transactionnelle du provider par défaut (copie de SmsProviderService).
  async setDefault(id: number): Promise<CallMaskingProviderEntity> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (provider == null) {
      throw new Error('CALL_MASKING_PROVIDER_NOT_FOUND');
    }
    await this.providerRepo.manager.transaction(async (manager) => {
      await manager.update(
        CallMaskingProviderEntity,
        { id: Not(id) },
        { isDefault: false },
      );
      await manager.update(
        CallMaskingProviderEntity,
        { id },
        { isDefault: true, enabled: true },
      );
    });
    return this.providerRepo.findOneByOrFail({ id });
  }

  // Test admin (optionnel). Le placement d'un vrai appel Twilio n'est exerçable
  // qu'en mise en service : ici on valide la config et on journalise.
  async testMaskedCall(number: string, providerId?: number): Promise<boolean> {
    let provider: CallMaskingProviderEntity | null;
    if (providerId != null) {
      provider = await this.providerRepo.findOneBy({ id: providerId });
      if (provider == null) {
        throw new Error('CALL_MASKING_PROVIDER_NOT_FOUND');
      }
      if (!provider.enabled) {
        throw new Error('CALL_MASKING_PROVIDER_DISABLED');
      }
    } else {
      provider = await this.getDefaultProvider();
      if (provider == null) {
        throw new Error('NO_DEFAULT_CALL_MASKING_PROVIDER');
      }
    }
    if (provider.type === CallMaskingProviderType.TwilioVoice) {
      if (
        provider.accountId == null ||
        provider.accountId === '' ||
        provider.apiSecret == null ||
        provider.apiSecret === '' ||
        provider.proxyNumber == null ||
        provider.proxyNumber === ''
      ) {
        throw new Error('CALL_MASKING_PROVIDER_MISCONFIGURED');
      }
    }
    this.logger.log(
      `[CallMasking test] provider=${provider.name} type=${provider.type} number=${number}`,
    );
    return true;
  }
}
