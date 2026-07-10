import { Field, InputType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';

@InputType()
export class OrderCancelReasonInput {
  title?: string;
  @Field()
  isEnabled?: boolean;
  @Field(() => AnnouncementUserType)
  userType?: AnnouncementUserType;
}
