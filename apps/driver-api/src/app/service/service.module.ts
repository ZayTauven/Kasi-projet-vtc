import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { MediaEntity } from '@kasi/database/media.entity';
import { ServiceCategoryEntity } from '@kasi/database/service-category.entity';
import { ServiceEntity } from '@kasi/database/service.entity';
import { ServiceService } from '@kasi/order/service.service';
import { UploadModule } from '../upload/upload.module';
import { ServiceDTO } from './dto/service.dto';

@Module({
  imports: [
    UploadModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          ServiceEntity,
          ServiceCategoryEntity,
          MediaEntity,
        ]),
      ],
      resolvers: [
        {
          EntityClass: ServiceEntity,
          DTOClass: ServiceDTO,
          create: { disabled: true },
          read: { disabled: true },
          update: { disabled: true },
          delete: { disabled: true },
        },
        // {
        //     EntityClass: ServiceCategoryEntity,
        //     DTOClass: ServiceCategoryDTO,
        //     pagingStrategy: PagingStrategies.NONE,
        //     create: { disabled: true },
        //     read: { one: { disabled: true } },
        //     update: { disabled: true },
        //     delete: { disabled: true },
        // }
      ],
    }),
  ],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
