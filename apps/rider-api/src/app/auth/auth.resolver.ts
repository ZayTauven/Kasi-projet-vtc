import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { VersionStatus } from '@kasi/database/enums/version-status.enum';
import { SharedRiderService } from '@kasi/order/shared-rider.service';

import { RiderDTO } from '../rider/dto/rider.dto';
import { UserContext } from './authenticated-user';
import { LoginDTO } from './dto/login.dto';
import { LoginInput } from './dto/login.input';
import { GqlAuthGuard } from './jwt-gql-auth.guard';
import { ForbiddenError } from '@nestjs/apollo';
import { AuthService } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(
    private riderService: SharedRiderService,
    private jwtService: JwtService,
    private authService: AuthService,
    @Inject(CONTEXT)
    private userContext: UserContext,
  ) {}

  // Passe desormais par `AuthService`, donc par l'abstraction
  // `IPhoneAuthVerifier`, comme driver-api. La version precedente appelait
  // `auth().verifyIdToken` en dur et lisait `firebase.identities.phone[0]` sans
  // repli : elle levait des que le jeton ne portait pas exactement cette
  // identite, alors que `FirebasePhoneAuthVerifier` gere aussi
  // `phone_number` et la revendication de premier niveau.
  @Mutation(() => LoginDTO)
  async login(
    @Args('input', { type: () => LoginInput }) input: LoginInput,
  ): Promise<LoginDTO> {
    const { user, isNewUser } = await this.authService.validateUser(
      input.firebaseToken,
    );
    const { token } = await this.authService.loginUser(user);
    return { jwtToken: token, isNewUser };
  }

  @Query(() => VersionStatus)
  async requireUpdate(
    @Args('versionCode', { type: () => Int }) versionCode: number,
  ) {
    if (
      process.env.MANDATORY_VERSION_CODE != null &&
      versionCode < parseInt(process.env.MANDATORY_VERSION_CODE)
    ) {
      return VersionStatus.MandatoryUpdate;
    }
    if (
      process.env.OPTIONAL_VERSION_CODE != null &&
      versionCode < parseInt(process.env.OPTIONAL_VERSION_CODE)
    ) {
      return VersionStatus.OptionalUpdate;
    }
    return VersionStatus.Latest;
  }

  @Mutation(() => RiderDTO)
  @UseGuards(GqlAuthGuard)
  async deleteUser() {
    return this.riderService.deleteById(this.userContext.req.user.id);
  }

  @Mutation(() => LoginDTO)
  async skipVerification(@Args('mobileNumber') mobileNumber: string) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new ForbiddenError('Not in demo mode');
    }
    if (mobileNumber.startsWith('+')) {
      mobileNumber = mobileNumber.substring(1);
    }
    const { user, isNewUser } =
      await this.riderService.findOrCreateUserWithMobileNumberEx(mobileNumber);
    const payload = { id: user.id };
    return {
      jwtToken: this.jwtService.sign(payload),
      isNewUser,
    };
  }
}
