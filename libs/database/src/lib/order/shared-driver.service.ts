import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { postWalletOperation, WalletPostingResult } from './wallet-ledger';

import { DriverTransactionEntity } from '../entities/driver-transaction.entity';
import { DriverWalletEntity } from '../entities/driver-wallet.entity';
import { DriverEntity } from '../entities/driver.entity';
import { DriverStatus } from '../entities/enums/driver-status.enum';
import {
  PackageSize,
  packageSizeRank,
} from '../entities/enums/package-size.enum';
import { ServiceOrderType } from '../entities/enums/service-order-type.enum';
import { ServiceEntity } from '../entities/service.entity';

@Injectable()
export class SharedDriverService {
  constructor(
    @InjectRepository(DriverEntity)
    public driverRepo: Repository<DriverEntity>,
    @InjectRepository(DriverWalletEntity)
    private driverWalletRepo: Repository<DriverWalletEntity>,
    @InjectRepository(DriverTransactionEntity)
    private driverTransactionRepo: Repository<DriverTransactionEntity>,
  ) {}

  async findById(id: number): Promise<DriverEntity> {
    return this.driverRepo.findOneOrFail({
      where: { id },
      withDeleted: true,
    });
  }

  async updateDriverStatus(driverId: number, status: DriverStatus) {
    return this.driverRepo.update(driverId, { status });
  }

  async getMaxRadiusForDriverServices(driverId: number): Promise<number> {
    const driver = await this.driverRepo.findOneOrFail({
      where: { id: driverId },
      relations: { enabledServices: true },
    });
    const radiuses = driver!.enabledServices.map(
      (service) => service.searchRadius,
    );
    const max = Math.max(...radiuses);
    return max > 0 ? max : 0;
  }

  async getOnlineDriversWithServiceId(
    driverIds: number[],
    serviceId: number,
    fleetIds: number[] = [],
    delivery?: { service: ServiceEntity; packageSize?: PackageSize | null },
  ) {
    let driversWithService: DriverEntity[];
    if (fleetIds.length > 0) {
      driversWithService = await this.driverRepo.find({
        where: {
          id: In(driverIds),
          status: DriverStatus.Online,
          fleetId: In(fleetIds),
        },
        relations: { enabledServices: true },
      });
    } else {
      driversWithService = await this.driverRepo.find({
        where: {
          id: In(driverIds),
          status: DriverStatus.Online,
        },
        relations: { enabledServices: true },
      });
    }
    driversWithService = driversWithService.filter((x) =>
      x.enabledServices.map((y) => y.id).includes(serviceId),
    );
    if (delivery?.service?.orderType === ServiceOrderType.Delivery) {
      driversWithService = driversWithService.filter(
        (x) =>
          x.canDeliver &&
          packageSizeRank(x.maxPackageSize) >=
            packageSizeRank(delivery.packageSize),
      );
    }
    return driversWithService;
  }

  async canDriverDoServiceAndFleet(
    driverId: number,
    serviceId: number,
    fleetIds: number[] = [],
  ): Promise<boolean> {
    return (
      (
        await this.getOnlineDriversWithServiceId(
          [driverId],
          serviceId,
          fleetIds,
        )
      ).length > 0
    );
  }

  async rechargeWallet(
    transaction: Pick<
      DriverTransactionEntity,
      | 'status'
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'amount'
      | 'currency'
      | 'driverId'
      | 'requestId'
      | 'operatorId'
      | 'paymentGatewayId'
      | 'refrenceNumber'
      | 'description'
      | 'idempotencyKey'
    >,
    manager: EntityManager = this.driverWalletRepo.manager,
  ): Promise<DriverWalletEntity> {
    return (await this.postTransaction(transaction, manager)).wallet;
  }

  /**
   * Comme `rechargeWallet`, en indiquant si l'operation a ete ecrite (`applied`)
   * ou absorbee comme rejeu (cle `idempotencyKey` deja connue). `guard` est
   * appele sous verrou avec le solde courant (ex. solde suffisant). p1-unicite.
   */
  async postTransaction(
    transaction: Parameters<SharedDriverService['rechargeWallet']>[0],
    manager: EntityManager = this.driverWalletRepo.manager,
    guard?: (currentBalance: number) => void,
  ): Promise<WalletPostingResult<DriverWalletEntity>> {
    const result = await postWalletOperation<
      DriverWalletEntity,
      DriverTransactionEntity
    >(manager, {
      walletEntity: DriverWalletEntity,
      transactionEntity: DriverTransactionEntity,
      owner: { driverId: transaction.driverId },
      currency: transaction.currency,
      amount: transaction.amount,
      transaction,
      recordZeroAmount: false,
      guard,
    });
    if (!result.applied) {
      Logger.log(
        `Operation deja enregistree, rejeu ignore (${transaction.idempotencyKey})`,
        'SharedDriverService',
      );
    }
    return result;
  }

  async setRating(driverId: number, rating: number, totalRatingCount: number) {
    return this.driverRepo.update(driverId, {
      rating: rating,
      reviewCount: totalRatingCount,
    });
  }

  async deleteById(id: number): Promise<DriverEntity> {
    const user = await this.findById(id);
    await this.driverRepo.softDelete(id);
    return user;
  }
}
