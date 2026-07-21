import { DeepPartial, QueryService } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ComplaintEntity } from '@kasi/database/complaint.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Like, Repository } from 'typeorm';
import { ComplaintDTO } from './dto/complaint.dto';
import { EnabledNotification } from '@kasi/database/enums/enabled-notification.enum';

@QueryService(ComplaintDTO)
export class ComplaintQueryService extends TypeOrmQueryService<ComplaintDTO> {
  constructor(
    @InjectRepository(ComplaintEntity) repo: Repository<ComplaintEntity>,
    @InjectRepository(OperatorEntity)
    private operatorRepo: Repository<OperatorEntity>,
    @InjectPubSub()
    private pubSub: RedisPubSub,
  ) {
    super(repo);
  }

  override async createOne(
    record: DeepPartial<ComplaintDTO>,
  ): Promise<ComplaintDTO> {
    let dto = await super.createOne(record);
    // `TypeOrmQueryService<ComplaintDTO>` type le `repo` hérité en
    // `Repository<ComplaintDTO>` (le DTO GraphQL, qui n'expose pas les
    // relations `request`/`activities`), alors qu'à l'exécution c'est bien
    // le repo de `ComplaintEntity` injecté au constructeur. Avec l'ancienne
    // syntaxe `relations: string[]`, TypeORM n'imposait pas ce contrôle ;
    // la syntaxe objet de TypeORM 1.0 le révèle. On recaste vers le vrai
    // type Entity pour cet appel précis, sans changer le comportement.
    let savedRecord = await (
      this.repo as unknown as Repository<ComplaintEntity>
    ).findOneOrFail({
      where: { id: dto.id },
      relations: { request: true, activities: true },
    });
    const admins = await this.operatorRepo.find({
      where: { enabledNotifications: EnabledNotification.Complaint },
    });
    this.pubSub.publish('complaintCreated', {
      complaintCreated: savedRecord,
      adminIds: admins.map((admin) => admin.id),
    });
    return savedRecord;
  }
}
