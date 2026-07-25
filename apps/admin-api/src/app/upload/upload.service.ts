import { Injectable } from '@nestjs/common';

import * as fastify from "fastify";
import { Repository } from 'typeorm';
import { MediaEntity } from '@kasi/database/media.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { storeUploadedFile } from '@kasi/database';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>
  ) { }

  async uploadMedia(req: any, res: fastify.FastifyReply<any>, dir: string, fileNamePrefix?: string): Promise<void> {
    const stored = await storeUploadedFile(req, { dir, fileNamePrefix });
    // `insert()` + `insert.raw.insertId` etait du MySQL : sur PostgreSQL
    // (database.module.ts : type 'postgres') `raw` est un TABLEAU de lignes,
    // donc `insertId` valait toujours `undefined`. Le admin-panel recevait
    // `{id: undefined}` et faisait `patchValue({mediaId: undefined})` : l'avatar
    // n'etait jamais rattache a l'enregistrement au submit. `save()` renvoie
    // l'entite avec son id, quel que soit le SGBD.
    const media = await this.mediaRepository.save({ address: stored.address });
    res.code(200).send({ id: media.id, address: stored.address });
  }
}
