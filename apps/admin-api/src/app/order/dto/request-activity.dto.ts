import { IDField } from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';

@ObjectType('RequestActivity')
export class RequestActivityDTO {
  @IDField(() => ID)
  id!: number;
  createdAt: Date;
  type: RequestActivityType;
}
