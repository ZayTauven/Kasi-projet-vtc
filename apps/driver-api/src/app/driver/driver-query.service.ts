import {
  DeepPartial,
  QueryService,
  UpdateOneOptions,
} from '@ptc-org/nestjs-query-core';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { Inject, Query } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { ServiceEntity } from '@kasi/database/service.entity';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { Repository } from 'typeorm';
import { UserContext } from '../auth/authenticated-user';
import { UpdateDriverInput } from './dto/update-driver.input';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { blockingDocumentTitles } from '@kasi/order/driver-document.service';

/** Statuts que le Kasiman peut se poser lui-meme (inscription comprise). */
const SELF_STATUSES = [
  DriverStatus.Offline,
  DriverStatus.Online,
  DriverStatus.WaitingDocuments,
  DriverStatus.SoftReject,
  DriverStatus.PendingApproval,
];
/** Seuls ces statuts permettent de se mettre en ligne ou hors ligne. */
const ACTIVE_STATUSES = [DriverStatus.Online, DriverStatus.Offline, DriverStatus.InService];

@QueryService(DriverEntity)
export class DriverQueryService extends TypeOrmQueryService<DriverEntity> {
  constructor(
    @InjectRepository(DriverEntity)
    private driverReposotriy: Repository<DriverEntity>,
    @InjectRepository(ServiceEntity)
    private serviceRepository: Repository<ServiceEntity>,
    private driverRedisService: DriverRedisService,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {
    super(driverReposotriy);
  }

  override async updateOne(
    id: string | number,
    update: UpdateDriverInput,
    opts?: UpdateOneOptions<DriverEntity>,
  ): Promise<DriverEntity> {
    id = this.context.req.user.id;
    if (update.status != null && !(await this.statusAllowed(id as number, update.status))) {
      delete update.status;
    }
    if (update.vehicleType !== undefined && !(await this.vehicleTypeChangeAllowed(id as number, update.vehicleType))) {
      delete update.vehicleType;
    }
    if (
      update.status == DriverStatus.PendingApproval &&
      process.env.DEMO_MODE != null
    ) {
      update.status = DriverStatus.Offline;
      const services = await this.serviceRepository.find();
      await this.driverReposotriy.save({
        id: id as number,
        enabledServices: services,
      });
    }
    if (update.status == DriverStatus.Offline) {
      await this.driverRedisService.expire([id]);
    }
    return super.updateOne(id, update, opts);
  }

  /**
   * p2-kyc K1 (2026-10-20, fiche KYC Q9) : l'ancien filtre comparait
   * `DriverStatus[status]`, toujours `undefined`, et laissait tout passer :
   * un Kasiman refuse, bloque ou suspendu pouvait se remettre `online`.
   * Desormais `online`/`offline` ne sont permis que depuis un statut actif,
   * et `online` jamais avec un document obligatoire expire. `pending
   * approval` reste permis (inscription de l'app installee). Un statut refuse
   * est ignore, comme avant : la reponse porte le vrai statut.
   */
  /**
   * p2-vehicules (2026-10-20) : le Kasiman choisit son vehicule a
   * l'inscription, ou une fois depuis le profil s'il n'en a pas (inscrit avant
   * p2-vehicules). Actif, il ne le change plus lui-meme : le type conditionne
   * les services et les documents valides par un operateur (tranche, a
   * revoir). Ignore comme un statut refuse : la reponse porte le vrai type.
   */
  private async vehicleTypeChangeAllowed(driverId: number, requested: VehicleType | null): Promise<boolean> {
    if (requested == null || !Object.values(VehicleType).includes(requested)) return false;
    const current = await this.driverReposotriy.findOne({
      where: { id: driverId },
      select: { id: true, status: true, vehicleType: true },
    });
    if (current == null) return false;
    if (current.vehicleType == null || current.vehicleType === requested) return true;
    return !ACTIVE_STATUSES.includes(current.status);
  }

  private async statusAllowed(driverId: number, requested: DriverStatus): Promise<boolean> {
    if (!SELF_STATUSES.includes(requested)) return false;
    if (requested !== DriverStatus.Online && requested !== DriverStatus.Offline) return true;
    const current = await this.driverReposotriy.findOne({
      where: { id: driverId },
      select: { id: true, status: true },
    });
    if (current == null || !ACTIVE_STATUSES.includes(current.status)) return false;
    if (requested === DriverStatus.Online) {
      return (await blockingDocumentTitles(this.driverReposotriy.manager, driverId)).length === 0;
    }
    return true;
  }
}
