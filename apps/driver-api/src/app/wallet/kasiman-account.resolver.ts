import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Int, Query, Resolver } from '@nestjs/graphql';
import {
  DebtLevel,
  defaultKasimanCurrency,
  kasimanDebtStatus,
} from '@kasi/order/debt-limit';
import { kasimanStatement } from '@kasi/order/kasiman-statement';
import { DataSource } from 'typeorm';

import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import {
  KasimanAccountDTO,
  KasimanStatementDTO,
} from './dto/kasiman-account.dto';

/**
 * p2-argent I3 (2026-10-19, fiche argent §6.2) : compte et releve du Kasiman
 * connecte. Requetes AJOUTEES (skill kasi-contrat-mobile-backend) : rien
 * d'existant ne change, les apps installees ne les appellent pas.
 *
 * `currency` facultative : par defaut, la devise du portefeuille le plus
 * endette du Kasiman, sinon celle de la premiere politique d'argent (XOF).
 */
@UseGuards(GqlAuthGuard)
@Resolver()
export class KasimanAccountResolver {
  constructor(
    private dataSource: DataSource,
    @Inject(CONTEXT) private context: UserContext,
  ) {}

  @Query(() => KasimanAccountDTO, { nullable: true })
  async kasimanAccount(
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
  ): Promise<KasimanAccountDTO | null> {
    const driverId = this.context.req.user.id;
    const manager = this.dataSource.manager;
    const resolved =
      currency?.trim().toUpperCase() || (await defaultKasimanCurrency(manager, driverId));
    if (resolved == null) {
      return null;
    }
    const status = await kasimanDebtStatus(manager, driverId, resolved);
    return {
      ...status,
      level: status.level,
      alert: status.level !== DebtLevel.Ok,
    };
  }

  @Query(() => KasimanStatementDTO, { nullable: true })
  async kasimanStatement(
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit = 20,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset = 0,
  ): Promise<KasimanStatementDTO | null> {
    const driverId = this.context.req.user.id;
    const manager = this.dataSource.manager;
    const resolved =
      currency?.trim().toUpperCase() || (await defaultKasimanCurrency(manager, driverId));
    if (resolved == null) {
      return null;
    }
    return kasimanStatement(manager, driverId, resolved, limit, offset);
  }
}
