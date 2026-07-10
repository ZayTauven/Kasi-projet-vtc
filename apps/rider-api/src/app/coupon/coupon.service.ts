import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CouponEntity } from '@kasi/database/coupon.entity';
import { RiderRechargeTransactionType } from '@kasi/database/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { GiftCardEntity } from '@kasi/database/gift-card.entity';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { ForbiddenError } from '@nestjs/apollo';
import { Repository } from 'typeorm';
import { RiderWalletDTO } from '../wallet/dto/rider-wallet.dto';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponEntity)
    private giftCardRepo: Repository<GiftCardEntity>,
    private sharedRiderService: SharedRiderService,
  ) {}

  async redeemGiftCard(code: string, riderId: number): Promise<RiderWalletDTO> {
    const card = await this.giftCardRepo.findOneBy({ code });
    if (card == null) throw new ForbiddenError('Invalid code');
    await this.giftCardRepo.update(card.id, { isUsed: true });
    return this.sharedRiderService.rechargeWallet({
      riderId,
      action: TransactionAction.Recharge,
      rechargeType: RiderRechargeTransactionType.Gift,
      status: TransactionStatus.Done,
      currency: card.currency,
      amount: card.amount,
      giftCardId: card.id,
    });
  }
}
