import { ObjectType } from '@nestjs/graphql';
import { Point } from '@kasi/database';

@ObjectType()
export class PlaceDTO {
  point: Point;
  title?: string;
  address: string;
}
