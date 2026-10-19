import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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
import { blockedForDebtDriverIds } from './debt-limit';

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

  /**
   * Kasimen prevenus d'une offre. p2-argent I3 (2026-10-19, fiche argent
   * §4.2) : un Kasiman au-dela du plafond de dette n'est ni notifie ni inscrit
   * dans `driverIds` (createOrder, processPrePay, relance du cron).
   * `currency` : devise de la course ; absente, le plafond est verifie dans
   * toutes les devises du Kasiman.
   */
  async getOnlineDriversWithServiceId(
    driverIds: number[],
    serviceId: number,
    fleetIds: number[] = [],
    delivery?: { service: ServiceEntity; packageSize?: PackageSize | null },
    currency?: string | null,
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
    if (driversWithService.length > 0) {
      const blocked = await blockedForDebtDriverIds(
        this.driverRepo.manager,
        driversWithService.map((driver) => driver.id),
        currency,
      );
      driversWithService = driversWithService.filter((x) => !blocked.has(x.id));
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

  // p2-argent I2 (2026-10-19) : `rechargeWallet` et `postTransaction` sont
  // retirees. Toute operation d'argent passe par `postLedgerEntry`
  // (ledger.ts), qui ecrit la ligne de portefeuille du Kasiman.

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
