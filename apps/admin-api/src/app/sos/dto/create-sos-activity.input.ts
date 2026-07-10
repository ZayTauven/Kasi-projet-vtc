import { Field, ID, InputType } from "@nestjs/graphql";
import { SOSActivityAction } from "@kasi/database/enums/sos-activity-action.enum";

@InputType()
export class CreateSOSAcitivtyInput {
    action: SOSActivityAction;
    note?: string;
    @Field(() => ID)
    sosId: number;
}