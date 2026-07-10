import {
  Authorize,
  FilterableField,
  IDField,
  PagingStrategies,
  QueryOptions,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

@ObjectType('Announcement')
@QueryOptions({
  pagingStrategy: PagingStrategies.NONE,
})
@Authorize({
  authorize: () => ({
    userType: { in: [[AnnouncementUserType.Driver]] },
    startAt: { lt: new Date() },
    expireAt: { gt: new Date() },
  }),
})
export class AnnouncementDTO {
  @IDField(() => ID)
  id: number;
  title: string;
  description: string;
  startAt: Date;
  expireAt: Date;
  url?: string;
  @FilterableField(() => AnnouncementUserType)
  userType: AnnouncementUserType[];
}
