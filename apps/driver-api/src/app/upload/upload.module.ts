import { NestjsQueryGraphQLModule } from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { DriverEntity } from '@kasi/database/driver.entity';
import { MediaEntity } from '@kasi/database/media.entity';
import { MediaDTO } from './media.dto';

// `UploadService` a ete supprime : il appelait `req.multipart(handler, done)`,
// une API retiree de @fastify/multipart depuis la v3 (v10.1.0 est installee), donc
// il aurait leve `TypeError: req.multipart is not a function` a la premiere
// utilisation. Aucun controleur ne l'appelait — les uploads passent par
// `driver-api.controller.ts` et le helper partage `storeUploadedFile`.

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([MediaEntity, DriverEntity]),
      ],
      resolvers: [
        {
          EntityClass: MediaEntity,
          DTOClass: MediaDTO,
          create: { disabled: true },
          read: { disabled: true },
          delete: { disabled: true },
          update: { disabled: true },
        },
      ],
    }),
  ],
  exports: [NestjsQueryGraphQLModule],
})
export class UploadModule {}
