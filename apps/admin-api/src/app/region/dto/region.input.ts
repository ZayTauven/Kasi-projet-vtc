import { Field, InputType } from '@nestjs/graphql';
import { Point } from '@kasi/database';

@InputType()
export class RegionInput {
  name!: string;
  currency!: string;
  enabled!: boolean;
  location: Point[][];
}
