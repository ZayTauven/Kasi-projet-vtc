import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { DriverTransactionEntity } from '@kasi/database/driver-transaction.entity';
import { DriverWalletEntity } from '@kasi/database/driver-wallet.entity';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverDeductTransactionType } from '@kasi/database/enums/driver-deduct-transaction-type.enum';
import { PayoutMethodType } from '@kasi/database/enums/payout-method-type.enum';
import { PayoutSessionStatus } from '@kasi/database/enums/payout-session-status.enum';
import { PayoutStatus } from '@kasi/database/enums/payout-status.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { PayoutMethodEntity } from '@kasi/database/payout-method.entity';
import { PayoutSessionEntity } from '@kasi/database/payout-session.entity';
import { PayoutEntity } from '@kasi/database/payout.entity';
import { CreatePayoutSessionInput } from './dto/create-payout-session.input';
import { PayoutSessionPreviewDTO } from './dto/payout-session-preview.dto';

interface EligibleDriver {
  driver: DriverEntity;
  method: PayoutMethodEntity;
  amount: number;
}

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(PayoutSessionEntity)
    private sessionRepo: Repository<PayoutSessionEntity>,
    @InjectRepository(PayoutEntity)
    private payoutRepo: Repository<PayoutEntity>,
    @InjectRepository(DriverEntity)
    private driverRepo: Repository<DriverEntity>,
    @InjectRepository(DriverWalletEntity)
    private walletRepo: Repository<DriverWalletEntity>,
    @InjectRepository(DriverTransactionEntity)
    private transactionRepo: Repository<DriverTransactionEntity>,
  ) {}

  // Kasimen payables : solde > 0 dans la devise, méthode de retrait active
  // dans la même devise, numéro de compte renseigné (sauf espèces), solde
  // au-dessus du plancher le plus élevé (session ou méthode). Le montant
  // versé est l'intégralité du solde.
  private async findEligible(
    input: CreatePayoutSessionInput,
  ): Promise<EligibleDriver[]> {
    const wallets = await this.walletRepo.find({
      where: { currency: input.currency, balance: MoreThan(0) },
    });
    if (wallets.length === 0) return [];
    const drivers = await this.driverRepo.find({
      where: { id: In(wallets.map((wallet) => wallet.driverId)) },
      relations: { payoutMethod: true },
    });
    const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
    const methodIds = (input.methodIds ?? []).map((id) => Number(id));
    const eligible: EligibleDriver[] = [];
    for (const wallet of wallets) {
      const driver = driversById.get(wallet.driverId);
      const method = driver?.payoutMethod;
      if (driver == null || method == null) continue;
      if (!method.enabled || method.currency !== input.currency) continue;
      if (methodIds.length > 0 && !methodIds.includes(method.id)) continue;
      if (
        method.type !== PayoutMethodType.Cash &&
        (driver.payoutAccountNumber == null ||
          driver.payoutAccountNumber.trim() === '')
      ) {
        continue;
      }
      const amount = Math.floor(Number(wallet.balance) * 100) / 100;
      const floor = Math.max(
        Number(input.minimumAmount ?? 0),
        Number(method.minimumAmount),
      );
      if (amount <= 0 || amount < floor) continue;
      eligible.push({ driver, method, amount });
    }
    return eligible;
  }

  async preview(
    input: CreatePayoutSessionInput,
  ): Promise<PayoutSessionPreviewDTO> {
    const eligible = await this.findEligible(input);
    return {
      eligibleCount: eligible.length,
      totalAmount: eligible.reduce((sum, item) => sum + item.amount, 0),
      currency: input.currency,
    };
  }

  async createSession(
    input: CreatePayoutSessionInput,
    operatorId: number,
  ): Promise<PayoutSessionEntity> {
    const eligible = await this.findEligible(input);
    if (eligible.length === 0) {
      throw new Error('NO_ELIGIBLE_DRIVER');
    }
    const session = await this.sessionRepo.save({
      currency: input.currency,
      minimumAmount: input.minimumAmount ?? 0,
      description: input.description,
      operatorId,
      totalAmount: eligible.reduce((sum, item) => sum + item.amount, 0),
    });
    await this.payoutRepo.save(
      eligible.map((item) => ({
        sessionId: session.id,
        driverId: item.driver.id,
        amount: item.amount,
        currency: input.currency,
        methodType: item.method.type,
        methodName: item.method.name,
        methodId: item.method.id,
        accountNumber:
          item.method.type === PayoutMethodType.Cash
            ? undefined
            : item.driver.payoutAccountNumber,
      })),
    );
    return this.sessionRepo.findOneOrFail({ where: { id: session.id } });
  }

  // Marque un versement comme payé (le paiement Wave/OM/virement/espèces a
  // eu lieu hors application) et débite le wallet du Kasiman.
  async processPayout(
    payoutId: number,
    operatorId: number,
  ): Promise<PayoutEntity> {
    const payout = await this.payoutRepo.findOneOrFail({
      where: { id: payoutId },
    });
    if (payout.status !== PayoutStatus.Pending) {
      throw new Error('PAYOUT_NOT_PENDING');
    }
    const amount = Number(payout.amount);
    const wallet = await this.walletRepo.findOneBy({
      driverId: payout.driverId,
      currency: payout.currency,
    });
    if (wallet == null || Number(wallet.balance) < amount) {
      throw new Error('INSUFFICIENT_DRIVER_BALANCE');
    }
    await this.walletRepo.update(wallet.id, {
      balance: Number(wallet.balance) - amount,
    });
    const transaction = await this.transactionRepo.save({
      action: TransactionAction.Deduct,
      deductType: DriverDeductTransactionType.Withdraw,
      status: TransactionStatus.Done,
      amount: -amount,
      currency: payout.currency,
      driverId: payout.driverId,
      operatorId,
      description: `Payout #${payout.id} (session #${payout.sessionId}, ${payout.methodName})`,
    });
    payout.status = PayoutStatus.Paid;
    payout.processedAt = new Date();
    payout.driverTransactionId = transaction.id;
    await this.payoutRepo.save(payout);
    await this.refreshSessionStatus(payout.sessionId);
    return payout;
  }

  // Paye tous les versements en attente de la session ; ceux dont le solde
  // est devenu insuffisant restent Pending (visibles dans le panel).
  async processSession(
    sessionId: number,
    operatorId: number,
  ): Promise<PayoutSessionEntity> {
    const pending = await this.payoutRepo.find({
      where: { sessionId, status: PayoutStatus.Pending },
    });
    for (const payout of pending) {
      try {
        await this.processPayout(payout.id, operatorId);
      } catch (error) {
        Logger.warn(
          `Payout #${payout.id} non payé : ${(error as Error).message}`,
          'PayoutService',
        );
      }
    }
    return this.sessionRepo.findOneOrFail({ where: { id: sessionId } });
  }

  async cancelPayout(payoutId: number): Promise<PayoutEntity> {
    const payout = await this.payoutRepo.findOneOrFail({
      where: { id: payoutId },
    });
    if (payout.status !== PayoutStatus.Pending) {
      throw new Error('PAYOUT_NOT_PENDING');
    }
    payout.status = PayoutStatus.Canceled;
    await this.payoutRepo.save(payout);
    await this.refreshSessionStatus(payout.sessionId);
    return payout;
  }

  async cancelSession(sessionId: number): Promise<PayoutSessionEntity> {
    await this.payoutRepo.update(
      { sessionId, status: PayoutStatus.Pending },
      { status: PayoutStatus.Canceled },
    );
    await this.refreshSessionStatus(sessionId);
    return this.sessionRepo.findOneOrFail({ where: { id: sessionId } });
  }

  // Une session reste Pending tant qu'il reste des versements en attente ;
  // sinon Processed si au moins un a été payé, Canceled dans le cas contraire.
  private async refreshSessionStatus(sessionId: number): Promise<void> {
    const payouts = await this.payoutRepo.find({ where: { sessionId } });
    if (payouts.some((payout) => payout.status === PayoutStatus.Pending)) {
      return;
    }
    if (payouts.some((payout) => payout.status === PayoutStatus.Paid)) {
      await this.sessionRepo.update(sessionId, {
        status: PayoutSessionStatus.Processed,
        processedAt: new Date(),
      });
    } else {
      await this.sessionRepo.update(sessionId, {
        status: PayoutSessionStatus.Canceled,
      });
    }
  }
}
