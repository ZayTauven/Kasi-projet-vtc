import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Query, Resolver } from '@nestjs/graphql';
import { ForbiddenError } from '@nestjs/apollo';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { DataSource } from 'typeorm';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PilotCancelReasonDTO,
  PilotDashboardDTO,
  PilotExportDTO,
  PilotKasimanDTO,
} from './dto/pilot-dashboard.dto';
import { PilotInsightsService } from './pilot-insights.service';

/**
 * p3-mesures M1 et M3 (2026-10-21) : tableau de suivi du pilote
 * (docs/fiche-mesures-pilote.md §4). Lecture seule.
 *
 * Droits (permissions existantes, sans migration) : `Requests_View` pour
 * tout ; l'indicateur 5 (argent) exige en plus `ProviderWallet_View`, sinon
 * ses champs valent null (et ses colonnes du CSV sont vides).
 *
 * Periode : `from` inclus, `to` exclu, 400 jours au plus
 * (`PILOT_PERIOD_INVALID` sinon).
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class PilotInsightsResolver {
  constructor(
    private readonly service: PilotInsightsService,
    private readonly dataSource: DataSource,
    @Inject(CONTEXT)
    private readonly context: UserContext,
  ) {}

  @Query(() => PilotDashboardDTO, {
    description: 'Indicateurs du pilote 1 a 9, par semaine et sur la periode (p3-mesures).',
  })
  async pilotDashboard(
    @Args('from', { type: () => Date }) from: Date,
    @Args('to', { type: () => Date }) to: Date,
  ): Promise<PilotDashboardDTO> {
    const permissions = await this.permissions();
    return this.service.dashboard(
      new Date(from),
      new Date(to),
      permissions.includes(OperatorPermission.ProviderWallet_View),
    );
  }

  @Query(() => [PilotCancelReasonDTO], {
    description: 'Annulations par auteur et par motif, sans motif compris (repris de BetterSuite).',
  })
  async pilotCancelReasons(
    @Args('from', { type: () => Date }) from: Date,
    @Args('to', { type: () => Date }) to: Date,
  ): Promise<PilotCancelReasonDTO[]> {
    await this.permissions();
    return this.service.cancelReasons(new Date(from), new Date(to));
  }

  @Query(() => [PilotKasimanDTO], {
    description: 'Les 10 premiers Kasimen par courses terminees puis gains (repris de BetterSuite).',
  })
  async pilotTopKasimen(
    @Args('from', { type: () => Date }) from: Date,
    @Args('to', { type: () => Date }) to: Date,
  ): Promise<PilotKasimanDTO[]> {
    await this.permissions();
    return this.service.topKasimen(new Date(from), new Date(to));
  }

  @Query(() => PilotExportDTO, {
    description: 'Export CSV des indicateurs, une ligne par semaine et par famille (p3-bilan).',
  })
  async pilotExport(
    @Args('from', { type: () => Date }) from: Date,
    @Args('to', { type: () => Date }) to: Date,
  ): Promise<PilotExportDTO> {
    const permissions = await this.permissions();
    const dashboard = await this.service.dashboard(
      new Date(from),
      new Date(to),
      permissions.includes(OperatorPermission.ProviderWallet_View),
    );
    return this.service.exportCsv(dashboard);
  }

  /** Permissions de l'operateur ; refus sans `Requests_View`. */
  private async permissions(): Promise<OperatorPermission[]> {
    const operator = await this.dataSource.getRepository(OperatorEntity).findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    const permissions = operator?.role?.permissions ?? [];
    if (!permissions.includes(OperatorPermission.Requests_View)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    return permissions;
  }
}

