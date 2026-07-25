import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CurrentConfiguration,
  UpdateConfigResult,
  UpdateConfigStatus,
} from './config.dto';
import * as fs from 'fs';
import * as fastify from 'fastify';
import { storeUploadedFile } from '@kasi/database';

/**
 * Nom canonique de la cle de service Firebase sur le disque. Impose, jamais
 * fourni par le client (voir `uploadFirebaseKeyFile`).
 */
export const FIREBASE_KEY_FILE_NAME = 'firebase-service-account.json';

@Injectable()
export class ConfigurationService {

  async getConfiguration(): Promise<CurrentConfiguration | null> {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    if (fs.existsSync(configAddress)) {
      const file = await fs.promises.readFile(configAddress, {
        encoding: 'utf-8',
      });
      const config: CurrentConfiguration = JSON.parse(file as string);
      const firebaseKeyFileAddress = `${process.cwd()}/config/${
        config.firebaseProjectPrivateKey
      }`;
      if (
        config.firebaseProjectPrivateKey != null &&
        fs.existsSync(firebaseKeyFileAddress)
      ) {
        // Return masked config: API keys are never exposed through the admin-panel API.
        // purchaseCode is intentionally omitted (phone-home removed in Kasi migration).
        return {
          adminPanelAPIKey: config.adminPanelAPIKey,
          backendMapsAPIKey: 'RESTRICTED',
          firebaseProjectPrivateKey: 'RESTRICTED',
        };
      }
      return config;
    } else {
      return new CurrentConfiguration();
    }
  }

  async saveConfiguration(
    newConfig: Partial<CurrentConfiguration>,
  ): Promise<boolean> {
    const config = await this.getConfiguration();
    const finalConfig = Object.assign(config, newConfig);
    const str = JSON.stringify(finalConfig);
    await fs.promises.mkdir(`${process.cwd()}/config`, { recursive: true });
    await fs.promises.writeFile(
      `${process.cwd()}/config/config.${
        process.env.NODE_ENV ?? 'production'
      }.json`,
      str,
    );
    return true;
  }

  async updateMapsAPIKey(
    backend: string,
    adminPanel: string,
  ): Promise<UpdateConfigResult> {
    await this.saveConfiguration({
      backendMapsAPIKey: backend,
      adminPanelAPIKey: adminPanel,
    });
    return {
      status: UpdateConfigStatus.OK,
    };
  }

  async updateFirebase(keyFileName: string): Promise<UpdateConfigResult> {
    await this.saveConfiguration({ firebaseProjectPrivateKey: keyFileName });
    return {
      status: UpdateConfigStatus.OK,
    };
  }

  /**
   * Ecrit la cle de service Firebase deposee par le wizard d'installation.
   *
   * Le nom de destination est IMPOSE : la version precedente reprenait
   * `data.filename` tel quel, ce qui permettait d'ecrire n'importe quel nom
   * dans `config/` (y compris `config.production.json`) et, via des segments
   * `../`, hors du repertoire. Le client ne choisit donc plus rien ; il lit le
   * nom retenu dans la reponse (`fileName`) pour le passer ensuite a
   * `updateFirebase`.
   */
  async uploadFirebaseKeyFile(req: any, res: fastify.FastifyReply<any>) {
    const stored = await storeUploadedFile(req, {
      dir: 'config',
      forcedFileName: FIREBASE_KEY_FILE_NAME,
      // Le nom et le repertoire etant imposes, le mimetype n'est pas la
      // barriere de securite : il ne sert qu'a ecarter un depot manifestement
      // errone. `application/octet-stream` est tolere car plusieurs systemes le
      // rapportent pour un `.json`.
      allowedMimeTypes: ['application/json', 'application/octet-stream'],
    });
    res
      .code(200)
      .send({ address: stored.address, fileName: FIREBASE_KEY_FILE_NAME });
  }
}
