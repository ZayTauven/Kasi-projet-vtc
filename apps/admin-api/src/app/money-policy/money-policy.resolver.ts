import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ForbiddenError } from '@nestjs/apollo';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { MoneyPolicyEntity } from '@kasi/database/money-policy.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { GraphQLError } from 'graphql';
import { DataSource } from 'typeorm';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MoneyPolicyDTO } from './dto/money-policy.dto';
import { UpdateMoneyPolicyInput } from './dto/update-money-policy.input';

/** Plafond maximal accepte : borne de securite (int PostgreSQL). */
const MAX_AMOUNT = 1_000_000_000;

function invalid(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'MONEY_POLICY_INVALID' } });
}

/**
 * p2-argent I3 (2026-10-19, fiche argent §4.1) : politique d'argent
 * (`money_policy`) cote back-office.
 *
 * - `moneyPolicies` : lecture, pour tout operateur connecte (la fiche et la
 *   liste des Kasimen en deduisent le statut normal / alerte / bloque) ;
 * - `debtBlockedDriverIds` : Kasimen au-dela du plafond (filtre « bloques » de
 *   la liste), meme regle SQL que `blockedForDebtDriverIds` ;
 * - `updateMoneyPolicy` : ecriture, permission `ProviderWallet_Edit` (reglage
 *   des comptes de Kasi ; aucune valeur d'enumeration nouvelle). La regle est
 *   relue a chaque controle : le changement vaut tout de suite.
 */
@Resolver(() => MoneyPolicyDTO)
@UseGuards(JwtAuthGuard)
export class MoneyPolicyResolver {
  constructor(
    private dataSource: DataSource,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => [MoneyPolicyDTO])
  async moneyPolicies(): Promise<MoneyPolicyDTO[]> {
    return this.dataSource
      .getRepository(MoneyPolicyEntity)
      .find({ order: { currency: 'ASC' } });
  }

  @Query(() => [ID])
  async debtBlockedDriverIds(): Promise<number[]> {
    const rows: Array<{ driverId: number }> = await this.dataSource.query(
      `SELECT DISTINCT w."driverId"
         FROM "driver_wallet" w
         JOIN "money_policy" p ON p."currency" = w."currency"
        WHERE -w."amount" > p."debtLimit"
        ORDER BY w."driverId"`,
    );
    return rows.map((r) => Number(r.driverId));
  }

  @Mutation(() => MoneyPolicyDTO)
  async updateMoneyPolicy(
    @Args('input', { type: () => UpdateMoneyPolicyInput })
    input: UpdateMoneyPolicyInput,
  ): Promise<MoneyPolicyDTO> {
    const operatorId = this.context.req.user.id;
    const operator = await this.dataSource.getRepository(OperatorEntity).findOne({
      where: { id: operatorId },
      relations: { role: true },
    });
    if (
      !operator?.role?.permissions.includes(OperatorPermission.ProviderWallet_Edit)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    const currency = (input.currency ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw invalid('Devise invalide : code ISO à trois lettres attendu.');
    }
    const { debtLimit, debtAlertThreshold } = input;
    for (const value of [debtLimit, debtAlertThreshold]) {
      if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_AMOUNT) {
        throw invalid('Le plafond et le seuil d\'alerte doivent être des entiers positifs.');
      }
    }
    if (debtAlertThreshold >= debtLimit) {
      throw invalid('Le seuil d\'alerte doit être inférieur au plafond.');
    }
    const repository = this.dataSource.getRepository(MoneyPolicyEntity);
    const existing = await repository.findOne({ where: { currency } });
    const policy = existing ?? repository.create({ currency });
    policy.debtLimit = debtLimit;
    policy.debtAlertThreshold = debtAlertThreshold;
    policy.updatedByOperatorId = operatorId;
    return repository.save(policy);
  }
}
