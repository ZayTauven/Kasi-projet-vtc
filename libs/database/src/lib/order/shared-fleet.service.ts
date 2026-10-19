import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FleetTransactionEntity } from '../entities/fleet-transaction.entity';
import { FleetWalletEntity } from '../entities/fleet-wallet.entity';
import { EntityManager, Repository } from 'typeorm';
import { postWalletOperation } from './wallet-ledger';
import { Point } from '../interfaces/point';
import { FleetEntity } from '@kasi/database/fleet.entity';

@Injectable()
export class SharedFleetService {
  constructor(
    @InjectRepository(FleetEntity)
    private fleetRepository: Repository<FleetEntity>,
    @InjectRepository(FleetWalletEntity)
    private fleetWalletRepository: Repository<FleetWalletEntity>,
    @InjectRepository(FleetTransactionEntity)
    private fleetTransactionEntity: Repository<FleetTransactionEntity>,
  ) {}

  async rechargeWallet(
    transaction: Pick<
      FleetTransactionEntity,
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'fleetId'
      | 'amount'
      | 'currency'
      | 'requestId'
      | 'driverId'
      | 'operatorId'
      | 'refrenceNumber'
      | 'description'
      | 'idempotencyKey'
    >,
    manager: EntityManager = this.fleetWalletRepository.manager,
  ): Promise<FleetWalletEntity> {
    // p1-unicite : ecriture unique et atomique (voir wallet-ledger.ts).
    const result = await postWalletOperation<
      FleetWalletEntity,
      FleetTransactionEntity
    >(manager, {
      walletEntity: FleetWalletEntity,
      transactionEntity: FleetTransactionEntity,
      owner: { fleetId: transaction.fleetId },
      currency: transaction.currency,
      amount: transaction.amount,
      transaction,
      recordZeroAmount: true,
    });
    return result.wallet;
  }

  async getFleetIdsInPoint(point: Point): Promise<number[]> {
    // SQL Postgres/PostGIS : colonne camelCase à quoter, SRID 4326 explicite.
    const fleets: { id: number }[] = await this.fleetRepository.query(
      `SELECT id FROM fleet WHERE ST_Within(ST_SetSRID(ST_MakePoint($1, $2), 4326), fleet."exclusivityAreas")`,
      [point.lng, point.lat],
    );
    return fleets.map((fleet) => fleet.id);
  }

  async getFleetById(id: number) {
    return this.fleetRepository.findOneBy({ id });
  }
}
