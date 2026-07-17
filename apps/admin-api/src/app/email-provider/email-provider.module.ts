import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { EmailProviderEntity } from '@kasi/database/email-provider.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailProviderDTO } from './dto/email-provider.dto';
import { EmailProviderInput } from './dto/email-provider.input';
import { EmailProviderResolver } from './email-provider.resolver';
import { EmailProviderService } from './email-provider.service';
import { EmailService } from './email.service';

// Pas de HttpModule ici (contrairement au SMS) : nodemailer parle SMTP en
// direct et n'utilise pas axios.
@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([EmailProviderEntity])],
      resolvers: [
        {
          EntityClass: EmailProviderEntity,
          DTOClass: EmailProviderDTO,
          CreateDTOClass: EmailProviderInput,
          UpdateDTOClass: EmailProviderInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [EmailProviderResolver, EmailProviderService, EmailService],
  // Exporté pour un futur consommateur métier (reçu de course, etc.).
  exports: [EmailService],
})
export class EmailProviderModule {}
