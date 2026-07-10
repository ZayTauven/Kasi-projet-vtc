import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminAPIModule } from './app/admin-api.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'path';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AdminAPIModule.register(),
    adapter,
  );

  const port = process.env.ADMIN_API_PORT || 3000;
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost', 'http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  });
  app.register(fastifyMultipart as unknown as any, {
    limits: {
      fileSize: 10_000_000,
    },
  });
  app.useStaticAssets({
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });
  await app.listen(port, '0.0.0.0', () => {
    Logger.log(`Listening at http://localhost:${port}`, 'Admin API');
  });
}

bootstrap();
