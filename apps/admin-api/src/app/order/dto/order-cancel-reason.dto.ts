import { Authorize, IDField } from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@kasi/database/enums/anouncement-user-type.enum';
import { ServiceAuthorizer } from '../../service/dto/service.authorizer';

@ObjectType('OrderCancelReason')
@Authorize(ServiceAuthorizer)
export class OrderCancelReasonDTO {
  @IDField(() => ID)
  id!: number;
  @Field()
  title!: string;
  @Field()
  isEnabled!: boolean;
  @Field(() => AnnouncementUserType)
  userType!: AnnouncementUserType;
}
