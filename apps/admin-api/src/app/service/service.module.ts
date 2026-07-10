import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { ServiceCategoryEntity } from '@kasi/database/service-category.entity';
import { ServiceOptionEntity } from '@kasi/database/service-option.entity';
import { ServiceEntity } from '@kasi/database/service.entity';
import { ZonePriceEntity } from '@kasi/database/zone-price.entity';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperatorModule } from '../operator/operator.module';
import { ServiceCategoryDTO } from './dto/service-category.dto';
import { ServiceOptionDTO } from './dto/service-option.dto';
import { ServiceDTO } from './dto/service.dto';
import { ZonePriceDTO } from './dto/zone-price.dto';
import { ServiceCategoryQueryService } from './service-category-query.service';
import { ServiceOptionQueryService } from './service-option-query.service';
import { ServiceQueryService } from './service-query.service';
import { ServiceOptionInput } from './dto/service-option.input';
import { ServiceInput } from './dto/service.input';
import { ServiceCategoryInput } from './dto/service-category.input';
import { ZonePriceInput } from './dto/zone-price.input';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          ServiceCategoryEntity,
          ServiceEntity,
          ServiceOptionEntity,
          ZonePriceEntity,
        ]),
        OperatorModule,
      ],
      services: [
        ServiceQueryService,
        ServiceCategoryQueryService,
        ServiceOptionQueryService,
      ],
      resolvers: [
        {
          EntityClass: ServiceEntity,
          DTOClass: ServiceDTO,
          ServiceClass: ServiceQueryService,
          CreateDTOClass: ServiceInput,
          UpdateDTOClass: ServiceInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.NONE,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: ServiceCategoryEntity,
          DTOClass: ServiceCategoryDTO,
          ServiceClass: ServiceCategoryQueryService,
          CreateDTOClass: ServiceCategoryInput,
          UpdateDTOClass: ServiceCategoryInput,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.NONE,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: ServiceOptionEntity,
          DTOClass: ServiceOptionDTO,
          CreateDTOClass: ServiceOptionInput,
          UpdateDTOClass: ServiceOptionInput,
          ServiceClass: ServiceOptionQueryService,
          create: { many: { disabled: true } },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.NONE,
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: ZonePriceEntity,
          DTOClass: ZonePriceDTO,
          CreateDTOClass: ZonePriceInput,
          UpdateDTOClass: ZonePriceInput,
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
})
export class ServiceModule {}
