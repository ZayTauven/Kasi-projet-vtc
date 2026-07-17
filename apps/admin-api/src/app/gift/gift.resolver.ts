import { Inject, UseGuards } from '@nestjs/common';
import { ForbiddenError } from '@nestjs/apollo';
import { Args, CONTEXT, Mutation, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { GiftBatchEntity } from '@kasi/database/gift-batch.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGiftBatchInput } from './dto/create-gift-batch.input';
import { GiftBatchDTO } from './dto/gift-batch.dto';
import { GiftService } from './gift.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class GiftResolver {
  constructor(
    private giftService: GiftService,
    @InjectRepository(OperatorEntity)
    private operatorRepository: Repository<OperatorEntity>,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  // Génère un lot + ses codes. Permission dédiée GiftCards_Create (distincte
  // de la simple lecture GiftCards_View).
  @Mutation(() => GiftBatchDTO)
  async createGiftBatch(
    @Args('input', { type: () => CreateGiftBatchInput })
    input: CreateGiftBatchInput,
  ): Promise<GiftBatchEntity> {
    const operator = await this.operatorRepository.findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (
      !operator.role?.permissions.includes(OperatorPermission.GiftCards_Create)
    ) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
    return this.giftService.createBatch(input);
  }
}
