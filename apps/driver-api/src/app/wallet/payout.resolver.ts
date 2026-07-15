import { Inject, UseGuards } from '@nestjs/common';
import { CONTEXT, Query, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutMethodEntity } from '@kasi/database/payout-method.entity';
import { PayoutEntity } from '@kasi/database/payout.entity';
import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { DriverPayoutDTO, PayoutMethodDTO } from './dto/payout.dto';

@UseGuards(GqlAuthGuard)
@Resolver()
export class PayoutResolver {
  constructor(
    @InjectRepository(PayoutMethodEntity)
    private methodRepo: Repository<PayoutMethodEntity>,
    @InjectRepository(PayoutEntity)
    private payoutRepo: Repository<PayoutEntity>,
    @Inject(CONTEXT) private context: UserContext,
  ) {}

  @Query(() => [PayoutMethodDTO])
  async payoutMethods(): Promise<PayoutMethodDTO[]> {
    return this.methodRepo.find({
      where: { enabled: true },
      order: { id: 'ASC' },
    });
  }

  @Query(() => [DriverPayoutDTO])
  async driverPayouts(): Promise<DriverPayoutDTO[]> {
    return this.payoutRepo.find({
      where: { driverId: this.context.req.user.id },
      order: { id: 'DESC' },
      take: 50,
    });
  }
}
