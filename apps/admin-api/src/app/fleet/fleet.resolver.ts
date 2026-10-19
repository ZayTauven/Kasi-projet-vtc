import { Inject, UseGuards } from "@nestjs/common";
import { Args, CONTEXT, Mutation, Resolver } from "@nestjs/graphql";
import { OperatorPermission } from "@kasi/database/enums/operator-permission.enum";
import { TransactionAction } from "@kasi/database/enums/transaction-action.enum";
import { OperatorEntity } from "@kasi/database/operator.entity";
import { SharedFleetService } from "@kasi/order/shared-fleet.service";
import { LedgerAccounts, postManualOperation } from "@kasi/order/ledger";
import { ForbiddenError } from "@nestjs/apollo";
import { DataSource } from "typeorm";
import { UserContext } from "../auth/authenticated-admin";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FleetTransactionInput } from "./dto/fleet-transaction.input";
import { FleetWalletDTO } from "./dto/fleet-wallet.dto";

@Resolver()
@UseGuards(JwtAuthGuard)
export class FleetResolver {
    constructor(
        private sharedFleetService: SharedFleetService,
        @Inject(CONTEXT)
        private context: UserContext,
        private datasource: DataSource,
    ) {}

    @Mutation(() => FleetWalletDTO)
    async createFleetTransaction(@Args('input', { type: () => FleetTransactionInput }) input: FleetTransactionInput) {
        // p2-argent I1 (2026-10-19) : permission dediee (A9). Avant : tout
        // operateur connecte pouvait crediter ou debiter une flotte.
        const operator = await this.datasource
            .getRepository(OperatorEntity)
            .findOne({
                where: { id: this.context.req.user.id },
                relations: { role: true },
            });
        if (
            !operator?.role?.permissions.includes(OperatorPermission.FleetWallet_Edit)
        ) {
            throw new ForbiddenError('PERMISSION_NOT_GRANTED');
        }
        input.amount = input.action == TransactionAction.Recharge ? Math.abs(input.amount) : Math.abs(input.amount) * -1;
        // p2-argent I2 (2026-10-19) : ecriture du grand livre avec contrepartie
        // et motif, facultatifs (defauts : KASI:CORRECTIONS, puis description).
        const posting = await postManualOperation(this.datasource.manager, {
            account: LedgerAccounts.flotte(input.fleetId),
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
            },
        });
        return posting.wallets[0].wallet;
    }
}
