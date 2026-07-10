import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonCouponModule } from '@kasi/coupon/common-coupon.module';

import { CouponEntity } from '@kasi/database/coupon.entity';
import { PaymentEntity } from '@kasi/database/payment.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import { SharedOrderModule } from '@kasi/order/shared-order.module';
import { OrderModule } from '../order/order.module';
import { CouponResolver } from './coupon.resolver';
import { CouponService } from './coupon.service';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    SharedOrderModule,
    CommonCouponModule,
    TypeOrmModule.forFeature([RequestEntity, CouponEntity, PaymentEntity]),
    // NestjsQueryGraphQLModule.forFeature({
    //   imports: [NestjsQueryTypeOrmModule.forFeature([CouponEntity])],
    //   resolvers: [
    //     {
    //       EntityClass: CouponEntity,
    //       DTOClass: CouponDTO,
    //       create: { disabled: true },
    //       read: { disabled: true },
    //       delete: { disabled: true },
    //       update: { disabled: true },
    //       guards: [GqlAuthGuard],
    //       pagingStrategy: PagingStrategies.NONE,
    //     },
    //   ],
    // }),
  ],
  providers: [CouponService, CouponResolver],
  exports: [CouponService],
})
export class CouponModule {}
