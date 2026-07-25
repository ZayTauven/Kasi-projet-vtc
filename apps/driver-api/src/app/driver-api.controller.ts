import {
  Controller,
  Get,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as fastify from 'fastify';
import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@kasi/database/driver.entity';
import { MediaEntity } from '@kasi/database/media.entity';
import { Repository } from 'typeorm';
import { CryptoService, storeUploadedFile } from '@kasi/database';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { DriverRechargeTransactionType } from '@kasi/database/enums/driver-recharge-transaction-type.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { version } from 'package.json';
import { PaymentEntity } from '@kasi/database/payment.entity';

@Controller()
export class DriverAPIController {
  constructor(
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    private cryptoService: CryptoService,
    private sharedDriverService: SharedDriverService
  ) {}

  @Get()
  async defaultPath(@Res() res: fastify.FastifyReply) {
    res.send(`✅ Driver API microservice running.\nVersion: ${version}`);
  }

  @Get('payment_result')
  async verifyPayment(
    @Req() req: fastify.FastifyRequest<{ Querystring: { token: string } }>,
    @Res() res: fastify.FastifyReply
  ) {
    const token = req.query.token;
    const decrypted = await this.cryptoService.decrypt(token);
    if (decrypted.userType == 'driver') {
      if (decrypted.status == 'success') {
        await this.sharedDriverService.rechargeWallet({
          driverId: decrypted.userId,
          amount: decrypted.amount,
          currency: decrypted.currency,
          refrenceNumber: decrypted.transactionNumber,
          action: TransactionAction.Recharge,
          rechargeType: DriverRechargeTransactionType.InAppPayment,
          paymentGatewayId: decrypted.gatewayId,
          status: TransactionStatus.Done,
        });
        await this.paymentRepository.delete({
          transactionNumber: decrypted.transactionNumber,
        });
      }
    }
    // Fastify 5 a inversé la signature de reply.redirect() :
    // (statusCode, url) -> (url, statusCode?). Voir fastify/types/reply.d.ts.
    res.redirect(
      `${
        process.env.DRIVER_APPLICATION_ID ?? 'default.driver.redirection'
      }://`,
      301
    );
  }

  @Get('success_message')
  async successMessage(
    @Req()
    req: fastify.FastifyRequest<{
      Querystring: { id_order: string };
      Body: { posted_data: string };
    }>,
    @Res() res: fastify.FastifyReply
  ) {
    res.send('Transaction successful. Close this page and go back to the app.');
  }

  @Post('upload_profile')
  @UseGuards(RestJwtAuthGuard)
  async upload(@Request() req: any, @Res() res: fastify.FastifyReply) {
    const stored = await storeUploadedFile(req, {
      dir: 'uploads',
      fileNamePrefix: new Date().getTime().toString(),
    });
    const insert = await this.mediaRepository.save({ address: stored.address });
    await this.driverRepository.update((req as unknown as any).user.id, {
      mediaId: insert.id,
    });
    // `Fragment$DriverMedia.fromJson` cote Flutter caste `id` en String
    // (`(l$id as String)`) : renvoyer un nombre ferait lever le parsing.
    insert.id = insert.id.toString() as unknown as any;
    res.code(200).send(insert);
  }

  @Post('upload_document')
  @UseGuards(RestJwtAuthGuard)
  async uploadDocuement(@Request() req: any, @Res() res: fastify.FastifyReply) {
    const stored = await storeUploadedFile(req, {
      dir: 'uploads',
      fileNamePrefix: new Date().getTime().toString(),
    });
    const insert = await this.mediaRepository.save({
      address: stored.address,
      driverDocumentId: (req as unknown as any).user.id,
    });
    insert.id = insert.id.toString() as unknown as any;
    res.code(200).send(insert);
  }
}
