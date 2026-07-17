import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { GiftBatchEntity } from '@kasi/database/gift-batch.entity';
import { GiftCardEntity } from '@kasi/database/gift-card.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGiftBatchInput } from './dto/create-gift-batch.input';
import { GiftBatchDTO } from './dto/gift-batch.dto';
import { GiftCardDTO } from './dto/gift-card.dto';
import { GiftResolver } from './gift.resolver';
import { GiftService } from './gift.service';

@Module({
  imports: [
    NestjsQueryTypeOrmModule.forFeature([OperatorEntity]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([GiftBatchEntity, GiftCardEntity]),
      ],
      resolvers: [
        {
          // Créés uniquement via createGiftBatch (GiftResolver).
          EntityClass: GiftBatchEntity,
          DTOClass: GiftBatchDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
        {
          // Lecture seule des codes ; protégée par GiftCardAuthorizer
          // (GiftCards_ViewCodes). Génération via createGiftBatch uniquement.
          EntityClass: GiftCardEntity,
          DTOClass: GiftCardDTO,
          create: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [GiftResolver, GiftService],
})
export class GiftModule {}
