import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point } from '@kasi/database';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { SOSEntity } from '@kasi/database/sos.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { In, Like, Repository } from 'typeorm';
import { EnabledNotification } from '@kasi/database/enums/enabled-notification.enum';

@Injectable()
export class SOSService {
  constructor(
    @InjectRepository(SOSEntity)
    private readonly sosRepository: Repository<SOSEntity>,
    @InjectRepository(OperatorEntity)
    private readonly operatorRepo: Repository<OperatorEntity>,
    @InjectPubSub()
    private pubSub: RedisPubSub,
  ) {}

  async submitSOS(input: {
    location: Point;
    requestId: number;
  }): Promise<SOSEntity> {
    let dto = await this.sosRepository.save({
      submittedByRider: false,
      ...input,
    });
    let savedRecord = await this.sosRepository.findOneOrFail({
      where: { id: dto.id },
      relations: {
        request: true,
        activities: true,
      },
    });
    const admins = await this.operatorRepo.find({
      where: { enabledNotifications: EnabledNotification.SOS },
    });
    this.pubSub.publish('sosCreated', {
      sosCreated: savedRecord,
      adminIds: admins.map((admin) => admin.id),
    });
    return savedRecord;
  }
}
