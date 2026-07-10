import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import * as fastify from 'fastify';
import { readFile, rm } from 'fs/promises';
import { credential, projectManagement } from 'firebase-admin';

import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { UploadService } from './upload/upload.service';
import { version } from 'package.json';
import { initializeApp } from 'firebase-admin/app';
import { existsSync } from 'fs';

@Controller()
export class AppController {
  constructor(private uploadService: UploadService) {}

  @Get()
  async defaultPath(@Res() res: fastify.FastifyReply) {
    res.send(`✅ Admin API microservice running.\nVersion: ${version}`);
  }

  @Post('upload')
  @UseGuards(RestJwtAuthGuard)
  async upload(
    @Req() req: fastify.FastifyRequest,
    @Res() res: fastify.FastifyReply,
  ) {
    await this.uploadService.uploadMedia(
      req,
      res,
      'uploads',
      new Date().getTime().toString(),
    );
  }

  @Get('reconfig')
  async reconfig(
    @Req() req: fastify.FastifyRequest,
    @Res() res: fastify.FastifyReply,
  ) {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    await rm(configAddress);
    res.send('✅ Config file deleted. Restarting...');
    process.exit(1);
  }

  @Get('apps')
  async apps(@Res() res: fastify.FastifyReply) {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    if (existsSync(configAddress)) {
      const file = await readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      initializeApp({
        credential: credential.cert(
          `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
        ),
      });
      let apps = await projectManagement().listAppMetadata();
      let finalListOfApps = [];
      for (let app of apps) {
        if (app.platform === 'ANDROID') {
          const config = JSON.parse(
            await projectManagement().androidApp(app.appId).getConfig(),
          );
          finalListOfApps.push({
            packageName: config.client
              .filter((c) => c.client_info.mobilesdk_app_id == app.appId)
              .map((c) => c.client_info.android_client_info.package_name)[0],
          });
        }
      }
      res.send(finalListOfApps);
      return finalListOfApps;
    }
  }
}
