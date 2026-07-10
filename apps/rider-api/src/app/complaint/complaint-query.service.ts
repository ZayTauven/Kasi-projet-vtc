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
    let savedRecord = await this.repo.findOneOrFail({
      where: { id: dto.id },
      relations: ['request', 'activities'],
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
