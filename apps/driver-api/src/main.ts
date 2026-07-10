import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'path';

import { DriverAPIModule } from './app/driver-api.module';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { initializeApp } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    DriverAPIModule,
    adapter,
  );

  const port = process.env.DRIVER_API_PORT || 3000;
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost', 'http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  });
  app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 10000000,
    },
  });
  app.useStaticAssets({
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });
  const configAddress = `${process.cwd()}/config/config.${
    process.env.NODE_ENV ?? 'production'
  }.json`;
  if (existsSync(configAddress)) {
    const file = await readFile(configAddress, { encoding: 'utf-8' });
    const config = JSON.parse(file as string);
    if (
      config.firebaseProjectPrivateKey != null &&
      existsSync(`${process.cwd()}/config/${config.firebaseProjectPrivateKey}`)
    ) {
      initializeApp({
        credential: credential.cert(
          `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
        ),
      });
    }
  }
  await app.listen(port, '0.0.0.0', () => {
    Logger.log('Listening at http://localhost:' + port, 'Driver API');
  });
}

bootstrap();
