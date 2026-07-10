import {
  Authorize,
  FilterableField,
  IDField,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

@ObjectType('Announcement')
@Authorize({
  authorize: () => ({
    userType: { in: [[AnnouncementUserType.Rider]] },
    startAt: { lt: new Date() },
    expireAt: { gt: new Date() },
  }),
})
export class AnnouncementDTO {
  @IDField(() => ID)
  id: number;
  startAt: Date;
  expireAt: Date;
  title: string;
  description: string;
  url?: string;
  @FilterableField(() => AnnouncementUserType)
  userType: AnnouncementUserType[];
}
