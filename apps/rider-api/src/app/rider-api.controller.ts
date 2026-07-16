import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { RiderRechargeTransactionType } from '@kasi/database/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as fastify from 'fastify';
import { join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createWriteStream, promises } from 'fs';

const pump = promisify(pipeline);

import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { RiderEntity } from '@kasi/database/rider-entity';
import { Repository } from 'typeorm';
import { MediaEntity } from '@kasi/database/media.entity';
import { CryptoService } from '@kasi/database';
import { RiderOrderService } from './order/rider-order.service';
import { SharedOrderService } from '@kasi/order/shared-order.service';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { version } from 'package.json';
import { PaymentEntity } from '@kasi/database/payment.entity';
import {
  CallMaskingService,
  IncomingCallResolution,
} from '@kasi/order/call-masking.service';
import { createHmac, timingSafeEqual } from 'crypto';

@Controller()
export class RiderAPIController {
  constructor(
    private sharedRiderService: SharedRiderService,
    private sharedOrderService: SharedOrderService,
    private riderOrderService: RiderOrderService,
    private cryptoService: CryptoService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    @InjectRepository(RiderEntity)
    private riderRepository: Repository<RiderEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
    private callMaskingService: CallMaskingService,
  ) {}

  @Get()
  async defaultPath(@Res() res: fastify.FastifyReply) {
    res.send(`✅ Rider API microservice running.\nVersion: ${version}`);
  }

  @Get('payment_result')
  async verifyPayment(
    @Req()
    req: FastifyRequest<{
      Querystring: { token: string; redirect: '1' | '0' };
    }>,
    @Res() res: FastifyReply,
  ) {
    const token = req.query.token;
    const decrypted = await this.cryptoService.decrypt(token);
    Logger.log('Payment:' + JSON.stringify(decrypted));

    if (decrypted.userType == 'client') {
      if (decrypted.status == 'success') {
        await this.sharedRiderService.rechargeWallet({
          riderId: decrypted.userId,
          amount: decrypted.amount,
          currency: decrypted.currency,
          refrenceNumber: decrypted.transactionNumber,
          action: TransactionAction.Recharge,
          rechargeType: RiderRechargeTransactionType.InAppPayment,
          paymentGatewayId: decrypted.gatewayId,
          status: TransactionStatus.Done,
        });
        await this.paymentRepository.delete({
          transactionNumber: decrypted.transactionNumber,
        });
        let order = await this.riderOrderService.getCurrentOrder(
          decrypted.userId,
        );
        if (order?.status == OrderStatus.WaitingForPostPay) {
          await this.sharedOrderService.finish(order.id);
          order = await this.riderOrderService.getCurrentOrder(
            decrypted.userId,
          );
          this.pubSub.publish('orderUpdated', { orderUpdated: order });
        } else if (order?.status == OrderStatus.WaitingForPrePay) {
          order = await this.sharedOrderService.processPrePay(order.id);
          this.pubSub.publish('orderUpdated', { orderUpdated: order });
        }
        if (req.query.redirect == null || req.query.redirect == '1')
          res
            .code(301)
            .redirect(
              301,
              `${
                process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
              }://`,
            );
        res.send(
          'Transaction successful. Close this page and go back to the app.',
        );
      } else if (decrypted.status == 'authorized') {
        let order = await this.riderOrderService.getCurrentOrder(
          decrypted.userId,
        );
        order = await this.sharedOrderService.processPrePay(
          order.id,
          decrypted.amount,
        );
        this.pubSub.publish('orderUpdated', { orderUpdated: order });
        res
          .code(301)
          .redirect(
            301,
            `${
              process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
            }://`,
          );
        res.send(
          'Transaction successful. Close this page and go back to the app.',
        );
      } else {
        res
          .code(301)
          .redirect(
            301,
            `${
              process.env.RIDER_APPLICATION_ID ?? 'default.rider.redirection'
            }://`,
          );
        res.send(
          "Transaction wasn't successful. You can go back to the app and redo this.",
        );
      }
    }
  }

  @Post('upload_profile')
  @UseGuards(RestJwtAuthGuard)
  async upload(@Request() req: any, @Res() res: fastify.FastifyReply) {
    const data = await req.file();
    const dir = 'uploads';
    await promises.mkdir(dir, { recursive: true });
    const _fileName = join(dir, `${new Date().getTime()}-${data.filename}`);
    await pump(data.file, createWriteStream(_fileName));
    const insert = await this.mediaRepository.insert({ address: _fileName });
    await this.riderRepository.update((req as unknown as any).user.id, {
      mediaId: insert.raw.insertId,
    });
    res.code(200).send({ id: insert.raw.insertId, address: _fileName });
  }

  // Webhook voix Twilio ENTRANT (public, non-JWT), miroir de payment_result.
  // URL publique prod (nginx strippe /rider-api/) :
  //   https://kasigroupe.tech/rider-api/call/voice-webhook
  // NON testable en local (le mode Direct n'utilise pas de webhook) : exercé
  // uniquement en mise en service Twilio (numéro proxy + signature réelle).
  @Post('call/voice-webhook')
  async voiceWebhook(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const params = (req.body ?? {}) as Record<string, string>;
    const provider = await this.callMaskingService.getDefaultProvider();
    const authToken = provider?.webhookAuthToken;
    const signature = req.headers['x-twilio-signature'];
    const fullUrl = this.resolveWebhookUrl(req);
    if (
      authToken == null ||
      authToken === '' ||
      typeof signature !== 'string' ||
      !this.isValidTwilioSignature(authToken, signature, fullUrl, params)
    ) {
      Logger.warn('call/voice-webhook: missing or invalid Twilio signature');
      reply
        .code(403)
        .header('Content-Type', 'text/plain')
        .send('Invalid signature');
      return;
    }
    const resolution = await this.callMaskingService.resolveIncoming({
      proxyNumber: params.To,
      from: params.From,
    });
    reply
      .header('Content-Type', 'text/xml')
      .send(this.renderTwiml(params.To, resolution));
  }

  // Reconstruit l'URL exacte signée par Twilio. Derrière nginx (préfixe
  // /rider-api/ strippé), fournir TWILIO_VOICE_WEBHOOK_URL en prod ; sinon on
  // reconstruit depuis les en-têtes X-Forwarded (best-effort, service-time).
  private resolveWebhookUrl(req: FastifyRequest): string {
    if (process.env.TWILIO_VOICE_WEBHOOK_URL != null) {
      return process.env.TWILIO_VOICE_WEBHOOK_URL;
    }
    const proto =
      (req.headers['x-forwarded-proto'] as string) ?? req.protocol ?? 'https';
    const host =
      (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? '';
    return `${proto}://${host}${req.raw.url ?? ''}`;
  }

  // Algorithme standard Twilio : HMAC-SHA1 (base64) de l'URL + params triés (k+v).
  private isValidTwilioSignature(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean {
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const expected = createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // Rendu TwiML à partir du résultat PROVIDER-AGNOSTIQUE de resolveIncoming.
  private renderTwiml(
    proxyNumber: string,
    resolution: IncomingCallResolution,
  ): string {
    const header = '<?xml version="1.0" encoding="UTF-8"?>';
    if (resolution.action === 'dial') {
      return `${header}<Response><Dial callerId="${this.escapeXml(
        proxyNumber,
      )}"><Number>${this.escapeXml(
        resolution.target,
      )}</Number></Dial></Response>`;
    }
    return `${header}<Response><Say>The person you are trying to reach is not available.</Say><Hangup/></Response>`;
  }

  private escapeXml(value: string): string {
    return (value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
