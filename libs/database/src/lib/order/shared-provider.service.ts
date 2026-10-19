import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderTransactionEntity } from '../entities/provider-transaction.entity';
import { ProviderWalletEntity } from '../entities/provider-wallet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SharedProviderService {
  constructor(
    @InjectRepository(ProviderWalletEntity)
    private providerWalletRepo: Repository<ProviderWalletEntity>,
    @InjectRepository(ProviderTransactionEntity)
    private providerTransactionRepo: Repository<ProviderTransactionEntity>,
  ) {}

  // p2-argent I2 (2026-10-19) : `rechargeWallet` est retiree. Le portefeuille
  // de Kasi (admin_wallet) est la projection du compte KASI:PRODUITS : toute
  // operation passe par `postLedgerEntry` (ledger.ts).
}
