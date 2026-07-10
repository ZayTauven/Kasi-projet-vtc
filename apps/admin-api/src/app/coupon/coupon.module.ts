import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { Module } from '@nestjs/common';
import { CouponEntity } from '@kasi/database/coupon.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouponDTO } from './dto/coupon.dto';
import { CouponInput } from './dto/coupon.input';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([CouponEntity])],
      resolvers: [
        {
          EntityClass: CouponEntity,
          DTOClass: CouponDTO,
          CreateDTOClass: CouponInput,
          UpdateDTOClass: CouponInput,
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
export class CouponModule {}
