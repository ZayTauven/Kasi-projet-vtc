import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailProviderType } from '@kasi/database/enums/email-provider-type.enum';
import { EmailProviderEntity } from '@kasi/database/email-provider.entity';

// Envoi d'email découplé de la persistance : cette classe ne dépend que de
// nodemailer et a vocation à être consommée plus tard par la couche métier
// (reçu de course, etc. — hors périmètre P6.2, infra seule ici).
//
// Convention non bloquante : sendTestEmail (admin) attend et propage l'erreur
// pour un retour immédiat dans le panel. Un futur appel métier (ex: reçu de
// course) devra au contraire faire un .catch() fire-and-forget afin de ne
// jamais bloquer le flux d'une course sur un incident SMTP.
@Injectable()
export class EmailService {
  async send(
    provider: EmailProviderEntity,
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    switch (provider.type) {
      case EmailProviderType.LogOnly:
        // Mode dev/E2E : on journalise sans envoyer.
        Logger.log(
          `[EMAIL LogOnly] to=${to} subject=${subject}`,
          'EmailService',
        );
        return;
      case EmailProviderType.Smtp:
        return this.sendSmtp(provider, to, subject, text, html);
      default:
        throw new Error(
          `EMAIL_PROVIDER_TYPE_NOT_SUPPORTED: ${provider.type}`,
        );
    }
  }

  private requireSmtpConfig(provider: EmailProviderEntity): {
    host: string;
    port: number;
    fromAddress: string;
  } {
    if (
      provider.host == null ||
      provider.host === '' ||
      provider.port == null ||
      provider.fromAddress == null ||
      provider.fromAddress === ''
    ) {
      throw new Error(`EMAIL_PROVIDER_MISCONFIGURED: ${provider.name}`);
    }
    return {
      host: provider.host,
      port: provider.port,
      fromAddress: provider.fromAddress,
    };
  }

  // SMTP générique via nodemailer. Le transporter est créé à la volée par
  // envoi (pas de pool global) : simple, sans état partagé, suffisant pour le
  // volume d'emails transactionnels visé.
  private async sendSmtp(
    provider: EmailProviderEntity,
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const { host, port, fromAddress } = this.requireSmtpConfig(provider);
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: provider.secure,
        auth: provider.username
          ? { user: provider.username, pass: provider.password }
          : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      await transporter.sendMail({
        from: provider.fromName
          ? `"${provider.fromName}" <${fromAddress}>`
          : fromAddress,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw this.asReadableError('SMTP', error);
    }
  }

  // Erreur SMTP -> erreur GraphQL courte et lisible : on ne fuite jamais le
  // password ni la réponse SMTP brute (qui peut contenir des identifiants).
  private asReadableError(providerLabel: string, error: unknown): Error {
    const err = error as { code?: string; responseCode?: number; message?: string };
    const parts: string[] = [];
    if (err.code != null) parts.push(err.code);
    if (err.responseCode != null) parts.push(`SMTP ${err.responseCode}`);
    const detail = parts.length > 0 ? parts.join(' ') : (err.message ?? 'unknown error');
    return new Error(`${providerLabel}: ${String(detail).slice(0, 200)}`);
  }
}
