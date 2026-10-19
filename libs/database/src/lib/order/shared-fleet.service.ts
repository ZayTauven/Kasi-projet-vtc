import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FleetTransactionEntity } from '../entities/fleet-transaction.entity';
import { FleetWalletEntity } from '../entities/fleet-wallet.entity';
import { Repository } from 'typeorm';
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

  // p2-argent I2 (2026-10-19) : `rechargeWallet` est retiree. Toute operation
  // d'argent passe par `postLedgerEntry` (ledger.ts), qui ecrit la ligne de
  // portefeuille de la flotte.

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
