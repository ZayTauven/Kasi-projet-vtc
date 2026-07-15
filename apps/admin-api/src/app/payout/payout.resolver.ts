import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PayoutEntity } from '@kasi/database/payout.entity';
import { PayoutSessionEntity } from '@kasi/database/payout-session.entity';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePayoutSessionInput } from './dto/create-payout-session.input';
import { PayoutSessionPreviewDTO } from './dto/payout-session-preview.dto';
import { PayoutSessionDTO } from './dto/payout-session.dto';
import { PayoutDTO } from './dto/payout.dto';
import { PayoutService } from './payout.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class PayoutResolver {
  constructor(
    private payoutService: PayoutService,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => PayoutSessionPreviewDTO)
  async payoutSessionPreview(
    @Args('input', { type: () => CreatePayoutSessionInput })
    input: CreatePayoutSessionInput,
  ): Promise<PayoutSessionPreviewDTO> {
    return this.payoutService.preview(input);
  }

  @Mutation(() => PayoutSessionDTO)
  async createPayoutSession(
    @Args('input', { type: () => CreatePayoutSessionInput })
    input: CreatePayoutSessionInput,
  ): Promise<PayoutSessionEntity> {
    return this.payoutService.createSession(input, this.context.req.user.id);
  }

  @Mutation(() => PayoutDTO)
  async processPayout(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<PayoutEntity> {
    return this.payoutService.processPayout(id, this.context.req.user.id);
  }

  @Mutation(() => PayoutSessionDTO)
  async processPayoutSession(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<PayoutSessionEntity> {
    return this.payoutService.processSession(id, this.context.req.user.id);
  }

  @Mutation(() => PayoutDTO)
  async cancelPayout(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<PayoutEntity> {
    return this.payoutService.cancelPayout(id);
  }

  @Mutation(() => PayoutSessionDTO)
  async cancelPayoutSession(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<PayoutSessionEntity> {
    return this.payoutService.cancelSession(id);
  }
}
