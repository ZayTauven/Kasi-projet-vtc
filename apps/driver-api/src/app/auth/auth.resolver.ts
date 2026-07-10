import { Args, CONTEXT, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';

import { DriverService } from '../driver/driver.service';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { LoginInput } from './dto/login.input';
import { VersionStatus } from '@kasi/database/enums/version-status.enum';
import { DriverDTO } from '../driver/dto/driver.dto';
import { Inject, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './jwt-gql-auth.guard';
import { UserContext } from './authenticated-user';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { ForbiddenError } from '@nestjs/apollo';

@Resolver()
export class AuthResolver {
  constructor(
    private driverService: DriverService,
    private sharedDriverService: SharedDriverService,
    private jwtService: JwtService,
    private authService: AuthService,
    @Inject(CONTEXT)
    private userContext: UserContext,
  ) {}

  @Mutation(() => LoginDTO)
  async login(
    @Args('input', { type: () => LoginInput }) input: LoginInput,
  ): Promise<LoginDTO> {
    const user = await this.authService.validateUser(input.firebaseToken);
    const { token } = await this.authService.loginUser(user);
    return { jwtToken: token };
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

  @Mutation(() => DriverDTO)
  @UseGuards(GqlAuthGuard)
  async deleteUser() {
    return this.sharedDriverService.deleteById(this.userContext.req.user.id);
  }

  @Mutation(() => LoginDTO)
  async skipVerification(@Args('mobileNumber') mobileNumber: string) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new ForbiddenError('Not in demo mode');
    }
    if (mobileNumber.startsWith('+')) {
      mobileNumber = mobileNumber.substring(1);
    }
    const user = await this.driverService.findOrCreateUserWithMobileNumber(
      mobileNumber,
    );
    const payload = { id: user.id };
    return {
      jwtToken: this.jwtService.sign(payload),
    };
  }
}
