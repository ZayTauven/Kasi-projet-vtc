import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VehicleType } from '@kasi/database/enums/vehicle-type.enum';
import { ForbiddenError } from '@nestjs/apollo';
import { DriverDocumentTypeEntity } from '@kasi/database/driver-document-type.entity';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { DriverDocumentService } from '@kasi/order/driver-document.service';
import { GraphQLError } from 'graphql';
import { DataSource } from 'typeorm';

import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateDriverDocumentInput,
  DriverDocumentDTO,
  DriverDocumentReviewDTO,
  DriverDocumentTypeDTO,
  DriverDocumentTypeInput,
  ExpiringDriverDocumentDTO,
} from './dto/driver-document.dto';

const MAX_WITHIN_DAYS = 365;

/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman dans le back-office
 * (docs/fiche-kyc.md §4). Lecture : `Drivers_View` ; ecriture :
 * `Drivers_Edit` (aucune valeur d'enumeration nouvelle).
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class AdminDriverDocumentResolver {
  constructor(
    private readonly documents: DriverDocumentService,
    private readonly dataSource: DataSource,
    @Inject(CONTEXT) private readonly context: UserContext,
  ) {}

  @Query(() => [DriverDocumentTypeDTO])
  async driverDocumentTypes(): Promise<DriverDocumentTypeDTO[]> {
    await this.assert(OperatorPermission.Drivers_View);
    return this.documents.listTypes(true);
  }

  /** Documents d'un Kasiman (hors remplaces). */
  @Query(() => [DriverDocumentDTO])
  async driverDocuments(
    @Args('driverId', { type: () => ID }) driverId: number,
  ): Promise<DriverDocumentDTO[]> {
    await this.assert(OperatorPermission.Drivers_View);
    return (await this.documents.listForDriver(Number(driverId))) as DriverDocumentDTO[];
  }

  /** Documents valides qui expirent d'ici `withinDays` jours (30 par defaut). */
  @Query(() => [ExpiringDriverDocumentDTO])
  async expiringDriverDocuments(
    @Args('withinDays', { type: () => Int, nullable: true }) withinDays?: number | null,
  ): Promise<ExpiringDriverDocumentDTO[]> {
    await this.assert(OperatorPermission.Drivers_View);
    return this.documents.expiring(Math.min(Math.max(0, withinDays ?? 30), MAX_WITHIN_DAYS));
  }

  /**
   * p2-kyc K2 (2026-10-20) : Kasimen suspendus pour document expire
   * (`documentsSuspendedAt`), filtre « suspendus » de la liste du panel.
   */
  @Query(() => [ID])
  async documentSuspendedDriverIds(): Promise<number[]> {
    await this.assert(OperatorPermission.Drivers_View);
    const found: Array<{ id: number }> = await this.dataSource.query(
      `SELECT "id" FROM "driver"
        WHERE "documentsSuspendedAt" IS NOT NULL AND "deletedAt" IS NULL
        ORDER BY "id"`,
    );
    return found.map((r) => Number(r.id));
  }

  /**
   * p2-kyc K4 (2026-10-20) : documents obligatoires exiges pour le vehicule
   * du Kasiman et sans document valide (ce qui bloque son approbation).
   */
  @Query(() => [String])
  async missingDriverDocuments(@Args('driverId', { type: () => ID }) driverId: number): Promise<string[]> {
    await this.assert(OperatorPermission.Drivers_View);
    return this.documents.missingTitles(Number(driverId));
  }

  @Mutation(() => DriverDocumentTypeDTO)
  async createDriverDocumentType(
    @Args('input', { type: () => DriverDocumentTypeInput }) input: DriverDocumentTypeInput,
  ): Promise<DriverDocumentTypeDTO> {
    await this.assert(OperatorPermission.Drivers_Edit);
    const code = input.code?.trim().toLowerCase() ?? '';
    if (!/^[a-z0-9_]{2,32}$/.test(code) || !input.title?.trim()) {
      throw new GraphQLError('Code (a-z, 0-9, _) et titre requis.', {
        extensions: { code: 'DOCUMENT_TYPE_INVALID' },
      });
    }
    const repo = this.dataSource.getRepository(DriverDocumentTypeEntity);
    if ((await repo.count({ where: { code } })) > 0) {
      throw new GraphQLError('Ce code existe deja.', { extensions: { code: 'DOCUMENT_TYPE_INVALID' } });
    }
    return repo.save(repo.create({ ...this.clean(input), code, title: input.title.trim() }));
  }

  /** Le code ne change pas (lu par le code et les apps). */
  @Mutation(() => DriverDocumentTypeDTO)
  async updateDriverDocumentType(
    @Args('id', { type: () => ID }) id: number,
    @Args('input', { type: () => DriverDocumentTypeInput }) input: DriverDocumentTypeInput,
  ): Promise<DriverDocumentTypeDTO> {
    await this.assert(OperatorPermission.Drivers_Edit);
    const repo = this.dataSource.getRepository(DriverDocumentTypeEntity);
    const type = await repo.findOne({ where: { id: Number(id) } });
    if (type == null) {
      throw new GraphQLError('Type de document inconnu.', { extensions: { code: 'DOCUMENT_TYPE_UNKNOWN' } });
    }
    const patch = this.clean(input);
    if (input.title != null && input.title.trim() !== '') patch.title = input.title.trim();
    return repo.save({ ...type, ...patch });
  }

  /**
   * Document saisi par l'operateur, valide d'emblee : typer un fichier envoye
   * par l'ancienne app (fiche KYC Q11). Peut reactiver un Kasiman suspendu.
   */
  @Mutation(() => DriverDocumentReviewDTO)
  async createDriverDocument(
    @Args('input', { type: () => CreateDriverDocumentInput }) input: CreateDriverDocumentInput,
  ): Promise<DriverDocumentReviewDTO> {
    const operatorId = await this.assert(OperatorPermission.Drivers_Edit);
    return (await this.documents.createApproved(operatorId, Number(input.driverId), {
      typeId: Number(input.typeId),
      mediaId: input.mediaId == null ? null : Number(input.mediaId),
      number: input.number,
      expiresAt: input.expiresAt,
    })) as DriverDocumentReviewDTO;
  }

  /** Validation ou refus d'un document en attente. Rejeu : sans effet. */
  @Mutation(() => DriverDocumentReviewDTO)
  async reviewDriverDocument(
    @Args('id', { type: () => ID }) id: number,
    @Args('approve') approve: boolean,
    @Args('note', { type: () => String, nullable: true }) note?: string | null,
  ): Promise<DriverDocumentReviewDTO> {
    const operatorId = await this.assert(OperatorPermission.Drivers_Edit);
    return (await this.documents.review(operatorId, Number(id), approve, note)) as DriverDocumentReviewDTO;
  }

  private clean(input: DriverDocumentTypeInput): Partial<DriverDocumentTypeEntity> {
    const patch: Partial<DriverDocumentTypeEntity> = {};
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.isEnabled != null) patch.isEnabled = input.isEnabled;
    if (input.isRequired != null) patch.isRequired = input.isRequired;
    if (input.hasExpiryDate != null) patch.hasExpiryDate = input.hasExpiryDate;
    if (input.sortOrder != null) patch.sortOrder = input.sortOrder;
    if (input.vehicleTypes != null) {
      const known = Object.values(VehicleType);
      patch.vehicleTypes = [...new Set(input.vehicleTypes.filter((x) => known.includes(x)))];
    }
    if (input.reminderDays != null) {
      patch.reminderDays = [...new Set(input.reminderDays.filter((x) => Number.isInteger(x) && x >= 0 && x <= 365))]
        .sort((a, b) => b - a);
    }
    return patch;
  }

  private async assert(permission: OperatorPermission): Promise<number> {
    const operator = await this.dataSource.getRepository(OperatorEntity).findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (!operator?.role?.permissions.includes(permission)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    return operator.id;
  }
}
