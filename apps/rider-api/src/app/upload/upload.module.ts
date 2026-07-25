import { NestjsQueryGraphQLModule } from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { MediaEntity } from '@kasi/database/media.entity';
import { MediaDTO } from './media.dto';

// `UploadService` a ete supprime : il appelait `req.multipart(handler, done)`,
// une API retiree de @fastify/multipart depuis la v3 (v10.1.0 est installee), donc
// il aurait leve `TypeError: req.multipart is not a function` a la premiere
// utilisation. Aucun controleur ne l'appelait — l'upload d'avatar passe par
// `rider-api.controller.ts` et le helper partage `storeUploadedFile`.

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([MediaEntity])],
      resolvers: [
        {
          DTOClass: MediaDTO,
          EntityClass: MediaEntity,
          create: { disabled: true },
          read: { disabled: true },
          delete: { disabled: true },
          update: { disabled: true },
        },
      ],
    }),
  ],
})
export class UploadModule {}
