import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Context, CONTEXT, Subscription } from '@nestjs/graphql';
import { RequestEntity } from '@kasi/database/request.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PubSub } from 'graphql-subscriptions';
import { UserContext, WSContext } from '../auth/authenticated-admin';
import { ComplaintDTO } from './dto/complaint.dto';

@Injectable()
export class ComplaintSubscriptionService {
  constructor(
    @InjectPubSub()
    public pubSub: RedisPubSub,
  ) {}

  @Subscription(() => ComplaintDTO, {
    filter(
      this: ComplaintSubscriptionService,
      payload: { complaintCreated: ComplaintDTO; adminIds: number[] },
      variables,
      context: WSContext,
    ) {
      return payload.adminIds.includes(context.user.id);
    },
  })
  complaintCreated() {
    return this.pubSub.asyncIterator('complaintCreated');
  }
}
