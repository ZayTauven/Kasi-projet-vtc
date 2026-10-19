import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  CONTEXT,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Point } from '@kasi/database';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { LedgerAccounts, postManualOperation } from '@kasi/order/ledger';
import { settleKasimanDebt } from '@kasi/order/debt-limit';
import { ForbiddenError } from '@nestjs/apollo';
import { Repository } from 'typeorm';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverService } from './driver.service';
import { OnlineDriver, OnlineDriverWithData } from './dto/driver-location.dto';
import { DriverTransactionInput } from './dto/driver-transaction.input';
import { SettleDriverDebtInput } from './dto/settle-driver-debt.input';
import { DriverWalletDTO } from './dto/driver-wallet.dto';
import { DriverDTO } from './dto/driver.dto';
import { FeedbackParameterAggregateDto } from './dto/feedback-parameter-aggregate.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Resolver()
@UseGuards(JwtAuthGuard)
export class DriverResolver {
  constructor(
    private driverService: DriverService,
    private sharedDriverService: SharedDriverService,
    @InjectRepository(OperatorEntity)
    private operatorRepository: Repository<OperatorEntity>,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => [OnlineDriver])
  async getDriversLocation(
    @Args('center', { type: () => Point }) center: Point,
    @Args('count', { type: () => Int }) count: number,
  ): Promise<OnlineDriver[]> {
    return this.driverService.getDriversLocation(center, count);
  }

  @Query(() => [OnlineDriverWithData])
  async getDriversLocationWithData(
    @Args('center', { type: () => Point }) center: Point,
    @Args('count', { type: () => Int }) count: number,
  ): Promise<OnlineDriverWithData[]> {
    return this.driverService.getDriversLocationWithData(center, count);
  }

  @Mutation(() => DriverWalletDTO)
  async createDriverTransaction(
    @Args('input', { type: () => DriverTransactionInput })
    input: DriverTransactionInput,
  ) {
    // p2-argent I1 (2026-10-19) : permission dediee (A9). Avant : tout
    // operateur connecte pouvait crediter ou debiter un Kasiman.
    const operator = await this.operatorRepository.findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (
      !operator?.role?.permissions.includes(OperatorPermission.DriverWallet_Edit)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    input.amount =
      input.action == TransactionAction.Recharge
        ? Math.abs(input.amount)
        : Math.abs(input.amount) * -1;
    // p2-argent I2 (2026-10-19) : ecriture du grand livre avec contrepartie
    // et motif, facultatifs (defauts : KASI:CORRECTIONS, puis description).
    const posting = await postManualOperation(this.operatorRepository.manager, {
      account: LedgerAccounts.kasiman(input.driverId),
      amount: input.amount,
      currency: input.currency,
      operatorId: this.context.req.user.id,
      clientKey: input.idempotencyKey,
      counterparty: input.counterparty,
      motif: input.motif,
      walletFields: {
        action: input.action,
        deductType: input.deductType,
        rechargeType: input.rechargeType,
        refrenceNumber: input.refrenceNumber,
        description: input.description,
        status: TransactionStatus.Done,
      },
    });
    return posting.wallets[0].wallet;
  }

  /**
   * p2-argent I3 (2026-10-19, fiche argent §4.4) : reglement de la dette d'un
   * Kasiman (especes contre recu). Ecriture `CAISSE:<lieu> -x / KASIMAN +x`,
   * cle `debt-settlement:<cle>` : un double envoi ne credite qu'une fois.
   * Permission `DriverWallet_Edit`. Deblocage immediat.
   */
  @Mutation(() => DriverWalletDTO)
  async settleDriverDebt(
    @Args('input', { type: () => SettleDriverDebtInput })
    input: SettleDriverDebtInput,
  ) {
    const operator = await this.operatorRepository.findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (
      !operator?.role?.permissions.includes(OperatorPermission.DriverWallet_Edit)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    const posting = await settleKasimanDebt(this.operatorRepository.manager, {
      driverId: Number(input.driverId),
      amount: input.amount,
      currency: input.currency,
      receiptNumber: input.receiptNumber,
      motif: input.motif,
      location: input.location,
      idempotencyKey: input.idempotencyKey,
      operatorId: this.context.req.user.id,
    });
    return posting.wallets[0].wallet;
  }

  @Mutation(() => DriverDTO)
  async deleteOneDriver(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<DriverDTO> {
    const operator = await this.operatorRepository.findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (!operator.role?.permissions.includes(OperatorPermission.Drivers_Edit)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    return this.sharedDriverService.deleteById(id);
  }

  @Query(() => [FeedbackParameterAggregateDto])
  async driverFeedbackParametersSummary(
    @Args('driverId', { type: () => ID }) driverId: number,
  ): Promise<FeedbackParameterAggregateDto[]> {
    return this.driverService.driverFeedbackParametersSummary(driverId);
  }
}
