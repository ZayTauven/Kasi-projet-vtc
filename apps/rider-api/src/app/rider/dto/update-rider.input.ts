import {
  BeforeUpdateOne,
  UpdateOneInputType,
} from '@ptc-org/nestjs-query-graphql';
import { InputType } from '@nestjs/graphql';
import { Gender } from '@kasi/database/enums/gender.enum';
import { RiderDocumentType } from '@kasi/database/enums/rider-document-type';
import { UserContext } from '../../auth/authenticated-user';

@InputType()
@BeforeUpdateOne(
  (input: UpdateOneInputType<UpdateRiderInput>, context: UserContext) => {
    input.id = context.req.user.id;
    return input;
  },
)
export class UpdateRiderInput {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  email?: string;
  notificationPlayerId?: string;
  isResident?: boolean;
  idNumber?: string;
  documentType?: RiderDocumentType;
}
