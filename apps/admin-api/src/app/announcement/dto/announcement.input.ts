import { InputType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

@InputType()
export class AnnouncementInput {
  title: string;
  description: string;
  url?: string;
  userType: AnnouncementUserType[];
  startAt: Date;
  expireAt: Date;
}
