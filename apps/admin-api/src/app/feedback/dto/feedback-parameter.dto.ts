import {
  Authorize,
  FilterableField,
  IDField,
} from '@ptc-org/nestjs-query-graphql';
import { ID, ObjectType } from '@nestjs/graphql';
import { FeedbackParameterAuthorizer } from './feedback-parameter.authorizer';

@ObjectType('FeedbackParameter')
@Authorize(FeedbackParameterAuthorizer)
export class FeedbackParameterDTO {
  @IDField(() => ID)
  id: number;
  @FilterableField()
  title: string;
  @FilterableField()
  isGood: boolean;
}
