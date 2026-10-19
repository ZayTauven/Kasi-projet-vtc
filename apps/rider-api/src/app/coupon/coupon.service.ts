import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RiderRechargeTransactionType } from '@kasi/database/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { GiftCardEntity } from '@kasi/database/gift-card.entity';
import { RiderTransactionEntity } from '@kasi/database/rider-transaction.entity';
import { RiderWalletEntity } from '@kasi/database/rider-wallet.entity';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { MoneyKey } from '@kasi/order/wallet-ledger';
import { ForbiddenError } from '@nestjs/apollo';
import { In, Repository } from 'typeorm';
import { RiderWalletDTO } from '../wallet/dto/rider-wallet.dto';

/**
 * p2-argent I1 (2026-10-19) : refus lisibles de redeemGiftCard (rider-app
 * affiche tel quel le message de l'erreur GraphQL).
 */
export const GiftCardRefusal = {
  InvalidCode: 'Code de carte cadeau invalide.',
  AlreadyUsed: 'Cette carte cadeau a déjà été utilisée.',
  NotYetAvailable: "Cette carte cadeau n'est pas encore utilisable.",
  Expired: 'Cette carte cadeau a expiré.',
} as const;

@Injectable()
export class CouponService {
  constructor(
    // p2-argent I1 : le depot visait la table `coupon` (InjectRepository
    // (CouponEntity)) : un vrai code de carte repondait « Invalid code », un
    // code de coupon etait « utilise » (A8).
    @InjectRepository(GiftCardEntity)
    private giftCardRepo: Repository<GiftCardEntity>,
    private sharedRiderService: SharedRiderService,
  ) {}

  /**
   * Carte cadeau utilisee par le client (p2-argent I1, 2026-10-19).
   *
   * Dans UNE transaction :
   * 1. verrou de ligne sur la ou les cartes de ce code (SELECT ... FOR UPDATE ;
   *    `gift_card.code` n'est pas unique) : deux clients sur la meme carte
   *    passent l'un apres l'autre ;
   * 2. `isUsed`, disponibilite (`availableTimestamp`) et expiration
   *    (`expirationTimestamp`) verifies sous ce verrou ;
   * 3. `isUsed` pose et credit ecrit (cle `gift-card:<id>`) dans la meme
   *    transaction : tout ou rien.
   * Le second client recoit « deja utilisee ». Rejeu par le MEME client (timeout
   * mobile) : la carte est deja a lui, son portefeuille est renvoye sans
   * nouveau credit.
   */
  async redeemGiftCard(code: string, riderId: number): Promise<RiderWalletDTO> {
    const trimmed = (code ?? '').trim();
    if (trimmed === '') {
      throw new ForbiddenError(GiftCardRefusal.InvalidCode);
    }
    return this.giftCardRepo.manager.transaction(async (manager) => {
      const cards = await manager
        .getRepository(GiftCardEntity)
        .createQueryBuilder('card')
        .setLock('pessimistic_write')
        .where('card.code = :code', { code: trimmed })
        .orderBy('card.id', 'ASC')
        .getMany();
      if (cards.length === 0) {
        throw new ForbiddenError(GiftCardRefusal.InvalidCode);
      }
      const now = new Date();
      const card = cards.find((c) => !c.isUsed) ?? null;
      if (card == null) {
        // Rejeu du client qui a deja utilise cette carte : pas d'erreur.
        const own = await manager.getRepository(RiderTransactionEntity).findOne({
          where: {
            riderId,
            idempotencyKey: In(cards.map((c) => MoneyKey.giftCard(c.id))),
          },
        });
        if (own != null) {
          return manager
            .getRepository(RiderWalletEntity)
            .findOneByOrFail({ riderId, currency: own.currency });
        }
        throw new ForbiddenError(GiftCardRefusal.AlreadyUsed);
      }
      if (card.availableTimestamp != null && card.availableTimestamp > now) {
        throw new ForbiddenError(GiftCardRefusal.NotYetAvailable);
      }
      if (card.expirationTimestamp != null && card.expirationTimestamp < now) {
        throw new ForbiddenError(GiftCardRefusal.Expired);
      }
      await manager.update(GiftCardEntity, card.id, { isUsed: true });
      const posting = await this.sharedRiderService.postTransaction(
        {
          riderId,
          action: TransactionAction.Recharge,
          rechargeType: RiderRechargeTransactionType.Gift,
          status: TransactionStatus.Done,
          currency: card.currency,
          amount: card.amount,
          giftCardId: card.id,
          // p1-unicite : une carte ne credite qu'une fois, meme rejouee.
          idempotencyKey: MoneyKey.giftCard(card.id),
        },
        manager,
      );
      if (!posting.applied) {
        // Cle deja connue alors que la carte n'etait pas marquee : etat
        // incoherent, on refuse plutot que de crediter.
        throw new ForbiddenError(GiftCardRefusal.AlreadyUsed);
      }
      return posting.wallet;
    });
  }
}
