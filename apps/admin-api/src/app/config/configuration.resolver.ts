import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CurrentConfiguration,
  UpdateConfigResult,
  UpdateConfigStatus,
  UpdatePurchaseCodeResult,
  UpdatePurchaseCodeStatus,
} from './config.dto';
import { ConfigurationService } from './configuration.service';
import { ConfigWriteGqlGuard } from './config-write.guard';

/**
 * Toutes les operations de ce resolveur etaient exposees sans authentification.
 * Les ECRITURES sont desormais ouvertes uniquement pendant l'installation
 * (serveur non encore configure) et exigent un jeton admin ensuite — cf.
 * ConfigWriteGqlGuard.
 *
 * La garde est posee mutation par mutation et NON sur la classe : appliquee a
 * `currentConfiguration`, elle etait inversee par rapport a son objectif.
 * Serveur configure -> `getConfiguration()` renvoie deja une config masquee
 * (rien a proteger) mais la garde exigeait un jeton ; or `AppComponent` appelle
 * cette query AVANT de rendre la moindre route, y compris `/login`. Resultat :
 * la promesse rejetait, `isLoaded` restait `false` et tout visiteur non
 * authentifie n'obtenait qu'un ECRAN NOIR, page de connexion incluse.
 * Serveur non configure -> la garde laissait justement passer tout le monde,
 * donc elle ne fermait pas la fuite qu'elle visait. Celle-ci est traitee a la
 * source : `getConfiguration()` masque desormais `backendMapsAPIKey` dans les
 * deux cas.
 */
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
  @UseGuards(ConfigWriteGqlGuard)
  async updatePurchaseCode(
    @Args('purchaseCode', { type: () => String }) purchaseCode: string,
    @Args('email', { type: () => String, nullable: true }) email?: string,
  ): Promise<UpdatePurchaseCodeResult> {
    // Kasi migration: phone-home to Ridy licensing server (31.220.15.49:9000) removed.
    // Stub returns OK so the admin panel continues to function without external calls.
    return { status: UpdatePurchaseCodeStatus.OK };
  }

  @Mutation(() => UpdateConfigResult)
  @UseGuards(ConfigWriteGqlGuard)
  async updateMapsAPIKey(
    @Args('backend', { type: () => String }) backend: string,
    @Args('adminPanel', { type: () => String }) adminPanel: string,
  ): Promise<UpdateConfigResult> {
    return this.configurationService.updateMapsAPIKey(backend, adminPanel);
  }

  @Mutation(() => UpdateConfigResult)
  @UseGuards(ConfigWriteGqlGuard)
  async updateFirebase(
    @Args('keyFileName', { type: () => String }) keyFileName: string,
  ): Promise<UpdateConfigResult> {
    return this.configurationService.updateFirebase(keyFileName);
  }

  @Mutation(() => UpdateConfigResult)
  @UseGuards(ConfigWriteGqlGuard)
  async disablePreviousServer(
    @Args('ip', { type: () => String }) ip: string,
  ): Promise<UpdateConfigResult> {
    // Kasi migration: phone-home to Ridy licensing server (31.220.15.49:9000) removed.
    // Stub returns OK so any existing caller does not receive an error.
    return { status: UpdateConfigStatus.OK };
  }
}
