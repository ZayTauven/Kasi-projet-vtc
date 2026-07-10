import { InputType } from '@nestjs/graphql';

@InputType()
export class FeedbackParameterInput {
  title: string;
  isGood: boolean;
}
