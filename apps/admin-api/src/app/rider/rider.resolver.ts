import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Mutation, Resolver } from '@nestjs/graphql';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { TransactionAction } from '@kasi/database/enums/transaction-action.enum';
import { TransactionStatus } from '@kasi/database/enums/transaction-status.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { SharedRiderService } from '@kasi/order/shared-rider.service';
import { operatorIdempotencyKey } from '@kasi/order/wallet-ledger';
import { ForbiddenError } from '@nestjs/apollo';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderTransactionInput } from './dto/rider-transaction.input';
import { RiderWalletDTO } from './dto/rider-wallet.dto';
import { RiderDTO } from './dto/rider.dto';
import { DataSource } from 'typeorm';

@Resolver()
@UseGuards(JwtAuthGuard)
export class RiderResolver {
  constructor(
    private sharedRiderService: SharedRiderService,
    @Inject(CONTEXT)
    private context: UserContext,
    private datasource: DataSource,
  ) {}

  @Mutation(() => RiderWalletDTO)
  async createRiderTransaction(
    @Args('input', { type: () => RiderTransactionInput })
    input: RiderTransactionInput,
  ) {
    // p2-argent I1 (2026-10-19) : permission dediee (A9). Avant : tout
    // operateur connecte pouvait crediter ou debiter un client.
    const operator = await this.datasource
      .getRepository(OperatorEntity)
      .findOne({
        where: { id: this.context.req.user.id },
        relations: { role: true },
      });
    if (
      !operator?.role?.permissions.includes(OperatorPermission.RiderWallet_Edit)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    input.amount =
      input.action == TransactionAction.Recharge
        ? Math.abs(input.amount)
        : Math.abs(input.amount) * -1;
    return this.sharedRiderService.rechargeWallet({
      ...input,
      idempotencyKey: operatorIdempotencyKey(input.idempotencyKey),
      operatorId: this.context.req.user.id,
      status: TransactionStatus.Done,
    });
  }

  @Mutation(() => RiderDTO)
  async deleteOneRider(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<RiderDTO> {
    const operator = await this.datasource
      .getRepository(OperatorEntity)
      .findOne({
        where: { id: this.context.req.user.id },
        relations: { role: true },
      });
    if (!operator.role?.permissions.includes(OperatorPermission.Riders_Edit)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    return this.sharedRiderService.deleteById(id);
  }
}
