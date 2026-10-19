import { Inject, UseGuards } from '@nestjs/common';
import { CONTEXT, Query, Resolver } from '@nestjs/graphql';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { ledgerIntegrityReport } from '@kasi/order/ledger-integrity';
import { ForbiddenError } from '@nestjs/apollo';
import { DataSource } from 'typeorm';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LedgerIntegrityReportDTO } from './dto/ledger-integrity-report.dto';

/**
 * p2-argent I2 (2026-10-19) : controle d'integrite du grand livre, a la
 * demande (fiche §3.9). Lecture seule. Permission : `ProviderWallet_View`
 * (consultation des comptes de Kasi), deja attribuee aux roles comptables ;
 * aucune nouvelle valeur d'enumeration (le type PostgreSQL des permissions
 * demanderait une migration et le panel une mise a jour).
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class LedgerResolver {
  constructor(
    private dataSource: DataSource,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => LedgerIntegrityReportDTO)
  async ledgerIntegrityReport(): Promise<LedgerIntegrityReportDTO> {
    const operator = await this.dataSource.getRepository(OperatorEntity).findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (
      !operator?.role?.permissions.includes(OperatorPermission.ProviderWallet_View)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    const report = await ledgerIntegrityReport(this.dataSource.manager);
    return {
      ...report,
      openedAt: report.openedAt ?? undefined,
      issueCount: report.issues.length,
    };
  }
}
