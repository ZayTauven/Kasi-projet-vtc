import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CurrentConfiguration,
  UpdateConfigResult,
  UpdateConfigStatus,
  UpdatePurchaseCodeResult,
  UpdatePurchaseCodeStatus,
} from './config.dto';
import { ConfigurationService } from './configuration.service';

@Resolver()
export class ConfigurationResolver {
  constructor(private configurationService: ConfigurationService) {}
  // @Mutation(() => UploadResult)
  // async uploads(@Args('input', { type: () => GraphQLUpload }) {createReadStream,filename}): Promise<{url: string}> {
  //     return {url: filename};
  // }

  @Query(() => CurrentConfiguration)
  async currentConfiguration() {
    const currentConfig = await this.configurationService.getConfiguration();
    // if (currentConfig.purchaseCode == 'RESTRICTED') {
    //   throw new ForbiddenError('Already Configured');
    // }
    return currentConfig;
  }

  @Mutation(() => UpdatePurchaseCodeResult)
  async updatePurchaseCode(
    @Args('purchaseCode', { type: () => String }) purchaseCode: string,
    @Args('email', { type: () => String, nullable: true }) email?: string,
  ): Promise<UpdatePurchaseCodeResult> {
    // Kasi migration: phone-home to Ridy licensing server (31.220.15.49:9000) removed.
    // Stub returns OK so the admin panel continues to function without external calls.
    return { status: UpdatePurchaseCodeStatus.OK };
  }

  @Mutation(() => UpdateConfigResult)
  async updateMapsAPIKey(
    @Args('backend', { type: () => String }) backend: string,
    @Args('adminPanel', { type: () => String }) adminPanel: string,
  ): Promise<UpdateConfigResult> {
    return this.configurationService.updateMapsAPIKey(backend, adminPanel);
  }

  @Mutation(() => UpdateConfigResult)
  async updateFirebase(
    @Args('keyFileName', { type: () => String }) keyFileName: string,
  ): Promise<UpdateConfigResult> {
    return this.configurationService.updateFirebase(keyFileName);
  }

  @Mutation(() => UpdateConfigResult)
  async disablePreviousServer(
    @Args('ip', { type: () => String }) ip: string,
  ): Promise<UpdateConfigResult> {
    // Kasi migration: phone-home to Ridy licensing server (31.220.15.49:9000) removed.
    // Stub returns OK so any existing caller does not receive an error.
    return { status: UpdateConfigStatus.OK };
  }
}
