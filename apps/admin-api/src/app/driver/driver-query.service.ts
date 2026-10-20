import { QueryService, UpdateOneOptions } from '@ptc-org/nestjs-query-core';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { missingRequiredDocumentTitles } from '@kasi/order/driver-document.service';
import { GraphQLError } from 'graphql';
import { Repository } from 'typeorm';

import { UpdateDriverInput } from './dto/driver.input';

/** Statuts d'un Kasiman pas encore approuve. */
const NOT_APPROVED = [DriverStatus.WaitingDocuments, DriverStatus.PendingApproval];
/** Statuts qui valent approbation. */
const APPROVED = [DriverStatus.Online, DriverStatus.Offline];

/**
 * p2-kyc K4 et p2-vehicules (2026-10-20) : l'operateur n'approuve un nouveau
 * Kasiman (`waiting documents` / `pending approval` -> `offline`/`online`)
 * qu'avec un type de vehicule et tous les documents obligatoires exiges pour
 * ce vehicule, valides (fiche KYC Q3). Les Kasimen deja actifs et la
 * reactivation d'un suspendu ne sont pas concernes.
 */
@QueryService(DriverEntity)
export class AdminDriverQueryService extends TypeOrmQueryService<DriverEntity> {
  constructor(@InjectRepository(DriverEntity) private readonly drivers: Repository<DriverEntity>) {
    super(drivers);
  }

  override async updateOne(
    id: string | number,
    update: UpdateDriverInput,
    opts?: UpdateOneOptions<DriverEntity>,
  ): Promise<DriverEntity> {
    if (update.status != null && APPROVED.includes(update.status)) {
      await this.assertApprovable(Number(id), update);
    }
    return super.updateOne(id, update as Partial<DriverEntity>, opts);
  }

  private async assertApprovable(driverId: number, update: UpdateDriverInput): Promise<void> {
    const current = await this.drivers.findOne({
      where: { id: driverId },
      select: { id: true, status: true, vehicleType: true },
    });
    if (current == null || !NOT_APPROVED.includes(current.status)) return;
    const vehicleType = update.vehicleType !== undefined ? update.vehicleType : current.vehicleType;
    if (vehicleType == null) {
      throw new GraphQLError("Type de véhicule non renseigné : choisissez-le avant d'approuver ce Kasiman.", {
        extensions: { code: 'DRIVER_VEHICLE_TYPE_REQUIRED' },
      });
    }
    if (update.vehicleType !== undefined && update.vehicleType !== current.vehicleType) {
      // Le type change dans la meme sauvegarde : il fixe les documents exiges.
      await this.drivers.update(driverId, { vehicleType });
    }
    const missing = await missingRequiredDocumentTitles(this.drivers.manager, driverId);
    if (missing.length > 0) {
      throw new GraphQLError(`Documents obligatoires manquants ou non validés : ${missing.join(', ')}.`, {
        extensions: { code: 'DRIVER_DOCUMENTS_MISSING', missing },
      });
    }
  }
}
