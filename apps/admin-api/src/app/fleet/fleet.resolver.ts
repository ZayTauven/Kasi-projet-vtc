import { Inject, UseGuards } from "@nestjs/common";
import { Args, CONTEXT, Mutation, Resolver } from "@nestjs/graphql";
import { OperatorPermission } from "@kasi/database/enums/operator-permission.enum";
import { TransactionAction } from "@kasi/database/enums/transaction-action.enum";
import { OperatorEntity } from "@kasi/database/operator.entity";
import { SharedFleetService } from "@kasi/order/shared-fleet.service";
import { operatorIdempotencyKey } from "@kasi/order/wallet-ledger";
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
        return this.sharedFleetService.rechargeWallet({
            ...input,
            idempotencyKey: operatorIdempotencyKey(input.idempotencyKey),
            operatorId: this.context.req.user.id,
        });
    }
}
