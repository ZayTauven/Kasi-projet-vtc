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
import * as util from 'util';
import { join } from 'path';
import * as fastify from 'fastify';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

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

  async uploadFile(
    req: any,
    res: fastify.FastifyReply<any>,
    dir: string,
    fileNamePrefix?: string,
  ) {
    let _fileName = '';
    const data = await req.file();
    await fs.promises.mkdir(dir, { recursive: true });
    _fileName = join(
      dir,
      fileNamePrefix != null
        ? `${fileNamePrefix}-${data.filename}`
        : data.filename,
    );
    await pump(data.file, fs.createWriteStream(_fileName));
    res.code(200).send({ address: _fileName });
  }
}
