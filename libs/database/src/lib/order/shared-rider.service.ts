import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RiderEntity } from '../entities/rider-entity';
import { RiderTransactionEntity } from '../entities/rider-transaction.entity';
import { RiderWalletEntity } from '../entities/rider-wallet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SharedRiderService {
  constructor(
    @InjectRepository(RiderEntity) private repo: Repository<RiderEntity>,
    @InjectRepository(RiderWalletEntity)
    private riderWalletRepo: Repository<RiderWalletEntity>,
    @InjectRepository(RiderTransactionEntity)
    private riderTransactionRepo: Repository<RiderTransactionEntity>,
  ) {}

  async findById(id: number): Promise<RiderEntity> {
    return this.repo.findOneOrFail({ where: { id }, withDeleted: true });
  }

  private async findUserByMobileNumber(
    mobileNumber: string,
  ): Promise<RiderEntity | null> {
    return this.repo.findOne({ where: { mobileNumber }, withDeleted: true });
  }

  private async createUserWithMobileNumber(
    mobileNumber: string,
  ): Promise<RiderEntity> {
    const addResult = await this.repo.save({
      mobileNumber: mobileNumber,
    });
    return addResult;
  }

  /**
   * Variante de `findOrCreateUserWithMobileNumber` qui indique EN PLUS si le
   * compte vient d'etre cree.
   *
   * L'ancienne signature masquait cette information, donc `login` ne pouvait pas
   * la remonter et le rider-app envoyait TOUT le monde sur l'ecran « saisir
   * votre nom » — un utilisateur deja inscrit ne rejoignait jamais sa session
   * directement apres l'OTP.
   *
   * Un compte soft-supprime puis restaure n'est PAS considere comme nouveau : il
   * a deja un profil, il doit retrouver sa session sans repasser par
   * l'onboarding.
   */
  async findOrCreateUserWithMobileNumberEx(
    mobileNumber: string,
  ): Promise<{ user: RiderEntity; isNewUser: boolean }> {
    const findResult = await this.findUserByMobileNumber(mobileNumber);
    if (findResult?.deletedAt != null) {
      await this.repo.restore(findResult.id);
    }
    if (findResult == null) {
      return {
        user: await this.createUserWithMobileNumber(mobileNumber),
        isNewUser: true,
      };
    }
    return { user: findResult, isNewUser: false };
  }

  async findOrCreateUserWithMobileNumber(
    mobileNumber: string,
  ): Promise<RiderEntity> {
    return (await this.findOrCreateUserWithMobileNumberEx(mobileNumber)).user;
  }

  async deleteById(id: number): Promise<RiderEntity> {
    const user = await this.findById(id);
    await this.repo.softDelete(id);
    return user;
  }

  async getRiderCreditInCurrency(riderId: number, currency: string) {
    const wallet = await this.riderWalletRepo.findOneBy({ riderId, currency });
    return wallet?.balance ?? 0;
  }

  async rechargeWallet(
    transaction: Pick<
      RiderTransactionEntity,
      | 'status'
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'amount'
      | 'currency'
      | 'riderId'
      | 'requestId'
      | 'operatorId'
      | 'paymentGatewayId'
      | 'refrenceNumber'
      | 'description'
      | 'giftCardId'
    >,
  ): Promise<RiderWalletEntity> {
    let wallet = await this.riderWalletRepo.findOneBy({
      riderId: transaction.riderId,
      currency: transaction.currency,
    });
    if (wallet == null) {
      wallet = await this.riderWalletRepo.save({
        balance: transaction.amount,
        currency: transaction.currency,
        riderId: transaction.riderId,
      });
    } else {
      await this.riderWalletRepo.update(wallet.id, {
        balance: transaction.amount + wallet.balance,
      });
      wallet.balance += transaction.amount;
    }
    this.riderTransactionRepo.save(transaction);
    return wallet;
  }
}
