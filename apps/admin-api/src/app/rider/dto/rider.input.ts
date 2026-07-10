import { InputType } from '@nestjs/graphql';
import { Gender } from '@kasi/database/enums/gender.enum';
import { RiderStatus } from '@kasi/database/enums/rider-status.enum';

@InputType()
export class RiderInput {
  status?: RiderStatus;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  registrationTimestamp?: Date;
  email?: string;
  gender?: Gender;
  isResident?: boolean;
  idNumber?: string;
}
