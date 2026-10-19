import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderTransactionEntity } from '../entities/provider-transaction.entity';
import { ProviderWalletEntity } from '../entities/provider-wallet.entity';
import { EntityManager, Repository } from 'typeorm';
import { postWalletOperation } from './wallet-ledger';

@Injectable()
export class SharedProviderService {
  constructor(
    @InjectRepository(ProviderWalletEntity)
    private providerWalletRepo: Repository<ProviderWalletEntity>,
    @InjectRepository(ProviderTransactionEntity)
    private providerTransactionRepo: Repository<ProviderTransactionEntity>,
  ) {}

  async rechargeWallet(
    transaction: Pick<
      ProviderTransactionEntity,
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'amount'
      | 'currency'
      | 'requestId'
      | 'operatorId'
      | 'refrenceNumber'
      | 'description'
      | 'idempotencyKey'
    >,
    manager: EntityManager = this.providerWalletRepo.manager,
  ): Promise<ProviderWalletEntity> {
    // p1-unicite : ecriture unique et atomique (voir wallet-ledger.ts).
    const result = await postWalletOperation<
      ProviderWalletEntity,
      ProviderTransactionEntity
    >(manager, {
      walletEntity: ProviderWalletEntity,
      transactionEntity: ProviderTransactionEntity,
      owner: {},
      currency: transaction.currency,
      amount: transaction.amount,
      transaction,
      recordZeroAmount: false,
    });
    if (!result.applied) {
      Logger.log(
        `Operation deja enregistree, rejeu ignore (${transaction.idempotencyKey})`,
        'SharedProviderService',
      );
    }
    return result.wallet;
  }
}
