import { InputType } from '@nestjs/graphql';

@InputType()
export class ServiceCategoryInput {
  name!: string;
  enabled?: boolean;
}
