import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';
import { listCancelReasons } from '@kasi/order/cancel-reason';
import { CancelReasonDTO } from '@kasi/order/dto/cancel-reason.dto';
import { DataSource } from 'typeorm';

import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';

/** p3-mesures M4 (2026-10-22) : motifs d'annulation proposes au client. */
@Resolver(() => CancelReasonDTO)
export class CancelReasonResolver {
  constructor(private readonly dataSource: DataSource) {}

  @Query(() => [CancelReasonDTO], {
    description: "Motifs d'annulation du client, actifs, tries par id.",
  })
  @UseGuards(GqlAuthGuard)
  async cancelReasons(): Promise<CancelReasonDTO[]> {
    return listCancelReasons(this.dataSource.manager, AnnouncementUserType.Rider);
  }
}
