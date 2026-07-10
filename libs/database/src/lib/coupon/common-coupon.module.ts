import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponEntity } from '@kasi/database/coupon.entity';
import { RequestEntity } from '@kasi/database/request.entity';

import { CommonCouponService } from './common-coupon.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([RequestEntity, CouponEntity])
    ],
    providers: [CommonCouponService],
    exports: [CommonCouponService]
})
export class CommonCouponModule { }