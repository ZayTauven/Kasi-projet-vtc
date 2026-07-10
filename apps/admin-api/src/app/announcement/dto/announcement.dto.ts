import {
  Authorize,
  FilterableField,
  IDField,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';
import { AnnouncementAuthorizer } from './announcement.authorizer';

@ObjectType('Announcement')
@Authorize(AnnouncementAuthorizer)
export class AnnouncementDTO {
  @IDField(() => ID)
  id!: number;
  title: string;
  description: string;
  url?: string;
  userType: AnnouncementUserType[];
  startAt: Date;
  expireAt: Date;
}
