import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { ForbiddenError } from '@nestjs/apollo';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { DataSource } from 'typeorm';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DispatchAttemptDTO } from './dto/dispatch-attempt.dto';
import { UnservedDemandDTO } from './dto/unserved-demand.dto';

const MAX_LIMIT = 500;

/**
 * p2-dispatch D4 et D6 (2026-10-20) : lecture du journal du dispatch par
 * vagues dans le back-office, permission `Requests_View` (celle des courses ;
 * aucune valeur d'enumeration nouvelle).
 *
 * - `dispatchAttempts(requestId)` : sollicitations d'une course, par vague
 *   puis par rang (fiche de la course) ;
 * - `unservedDemands(since, limit)` : demandes non servies les plus recentes
 *   (7 derniers jours par defaut, 100 au plus par defaut, 500 au maximum).
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class DispatchJournalResolver {
  constructor(
    private dataSource: DataSource,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => [DispatchAttemptDTO])
  async dispatchAttempts(
    @Args('requestId', { type: () => ID }) requestId: number,
  ): Promise<DispatchAttemptDTO[]> {
    await this.assertCanViewRequests();
    const rows: DispatchAttemptDTO[] = await this.dataSource.query(
      `SELECT a."id", a."requestId", a."driverId",
              NULLIF(trim(concat_ws(' ', d."firstName", d."lastName")), '') AS "driverName",
              a."wave", a."rank", a."airDistanceM", a."roadDistanceM", a."roadDurationS",
              a."routingSource", a."outcome", a."offeredAt", a."respondedAt"
         FROM "dispatch_attempt" a
         LEFT JOIN "driver" d ON d."id" = a."driverId"
        WHERE a."requestId" = $1
        ORDER BY a."wave", a."rank", a."id"`,
      [Number(requestId)],
    );
    return rows;
  }

  @Query(() => [UnservedDemandDTO])
  async unservedDemands(
    @Args('since', { type: () => Date, nullable: true }) since?: Date | null,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number | null,
  ): Promise<UnservedDemandDTO[]> {
    await this.assertCanViewRequests();
    const from = since ?? new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const take = Math.min(Math.max(1, limit ?? 100), MAX_LIMIT);
    return this.dataSource.query(
      `SELECT "id", "requestId", "serviceId", ST_Y("point") AS "lat", ST_X("point") AS "lng",
              "driversSolicited", "createdAt", "alertedAt", "alertedDrivers"
         FROM "unserved_demand"
        WHERE "createdAt" >= $1
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT $2`,
      [from, take],
    );
  }

  private async assertCanViewRequests(): Promise<void> {
    const operator = await this.dataSource.getRepository(OperatorEntity).findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (!operator?.role?.permissions.includes(OperatorPermission.Requests_View)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
  }
}
