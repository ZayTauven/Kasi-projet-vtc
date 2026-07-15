import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SmsProviderType } from '@kasi/database/enums/sms-provider-type.enum';
import { SmsProviderEntity } from '@kasi/database/sms-provider.entity';

// Envoi de SMS découplé de la persistance : cette classe ne dépend que de
// HttpService et a vocation à être extraite plus tard dans une lib partagée
// (call masking, éventuel OTP maison). L'OTP actuel des apps reste Firebase.
@Injectable()
export class SmsService {
  constructor(private httpService: HttpService) {}

  async send(
    provider: SmsProviderEntity,
    to: string,
    body: string,
  ): Promise<void> {
    switch (provider.type) {
      case SmsProviderType.LogOnly:
        // Mode dev/E2E : on journalise sans envoyer.
        Logger.log(
          `[SMS LogOnly] to=${to} from=${provider.senderId ?? ''} body=${body}`,
          'SmsService',
        );
        return;
      case SmsProviderType.Twilio:
        return this.sendTwilio(provider, to, body);
      case SmsProviderType.OrangeSms:
        return this.sendOrange(provider, to, body);
      default:
        throw new Error(`SMS_PROVIDER_TYPE_NOT_SUPPORTED: ${provider.type}`);
    }
  }

  private requireCredentials(provider: SmsProviderEntity): {
    accountId: string;
    apiSecret: string;
  } {
    if (
      provider.accountId == null ||
      provider.accountId === '' ||
      provider.apiSecret == null ||
      provider.apiSecret === ''
    ) {
      throw new Error(`SMS_PROVIDER_MISCONFIGURED: ${provider.name}`);
    }
    return { accountId: provider.accountId, apiSecret: provider.apiSecret };
  }

  // API REST Twilio, Basic auth accountId:apiSecret, corps form-encoded.
  private async sendTwilio(
    provider: SmsProviderEntity,
    to: string,
    body: string,
  ): Promise<void> {
    const { accountId, apiSecret } = this.requireCredentials(provider);
    const form = new URLSearchParams({
      To: to,
      From: provider.senderId ?? '',
      Body: body,
    });
    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
            accountId,
          )}/Messages.json`,
          form.toString(),
          {
            auth: { username: accountId, password: apiSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
    } catch (error) {
      throw this.asReadableError('Twilio', error);
    }
  }

  // API Orange Developer (pertinent Sénégal) : OAuth2 client_credentials
  // puis POST outboundSMSMessageRequest.
  private async sendOrange(
    provider: SmsProviderEntity,
    to: string,
    body: string,
  ): Promise<void> {
    const { accountId, apiSecret } = this.requireCredentials(provider);
    const sender = (provider.senderId ?? '').replace(/^\+/, '');
    let accessToken: string;
    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://api.orange.com/oauth/v3/token',
          new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
          {
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${accountId}:${apiSecret}`,
              ).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      accessToken = tokenResponse.data.access_token;
    } catch (error) {
      throw this.asReadableError('OrangeSms (oauth)', error);
    }
    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B${encodeURIComponent(
            sender,
          )}/requests`,
          {
            outboundSMSMessageRequest: {
              address: `tel:+${to.replace(/^\+/, '')}`,
              senderAddress: `tel:+${sender}`,
              outboundSMSTextMessage: { message: body },
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );
    } catch (error) {
      throw this.asReadableError('OrangeSms', error);
    }
  }

  // Erreur HTTP provider -> erreur GraphQL courte et lisible, sans le secret.
  private asReadableError(providerLabel: string, error: unknown): Error {
    const response = (
      error as { response?: { status?: number; data?: unknown } }
    ).response;
    if (response != null) {
      const detail = this.extractDetail(response.data);
      return new Error(
        `${providerLabel}: HTTP ${response.status}${
          detail !== '' ? ` - ${detail}` : ''
        }`,
      );
    }
    return new Error(
      `${providerLabel}: ${(error as Error).message ?? 'unknown error'}`,
    );
  }

  private extractDetail(data: unknown): string {
    if (data == null) return '';
    if (typeof data === 'string') return data.slice(0, 200);
    const record = data as Record<string, any>;
    const detail =
      record.message ?? // Twilio
      record.error_description ?? // OAuth Orange
      record.requestError?.serviceException?.text ?? // API SMS Orange
      record.requestError?.policyException?.text ??
      '';
    return String(detail).slice(0, 200);
  }
}
