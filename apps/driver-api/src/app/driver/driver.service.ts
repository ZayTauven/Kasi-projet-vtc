import { Injectable } from '@nestjs/common';
import { DriverEntity } from '@kasi/database/driver.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(DriverEntity) private repo: Repository<DriverEntity>,
    private driverRedisService: DriverRedisService,
  ) {}

  private async findUserByMobileNumber(
    mobileNumber: string,
  ): Promise<DriverEntity | null> {
    return this.repo.findOne({ where: { mobileNumber }, withDeleted: true });
  }

  /**
   * Variante de `findOrCreateUserWithMobileNumber` qui indique EN PLUS si le
   * compte vient d'etre cree, information dont `login` a besoin pour que le
   * mobile sache s'il doit lancer l'inscription ou rejoindre la session.
   *
   * Un compte soft-supprime puis restaure n'est PAS considere comme nouveau.
   */
  async findOrCreateUserWithMobileNumberEx(
    mobileNumber: string,
  ): Promise<{ user: DriverEntity; isNewUser: boolean }> {
    const findResult = await this.findUserByMobileNumber(mobileNumber);
    if (findResult?.deletedAt != null) {
      await this.repo.restore(findResult.id);
    }
    if (findResult == null) {
      return {
        user: await this.repo.save({ mobileNumber: mobileNumber }),
        isNewUser: true,
      };
    }
    return { user: findResult, isNewUser: false };
  }

  async findOrCreateUserWithMobileNumber(
    mobileNumber: string,
  ): Promise<DriverEntity> {
    return (await this.findOrCreateUserWithMobileNumberEx(mobileNumber)).user;
  }

  async findByIds(ids: number[]): Promise<DriverEntity[]> {
    return this.repo.find({ where: { id: In(ids) }, withDeleted: true });
  }

  async expireDriverStatus(driverIds: number[]) {
    if (driverIds.length < 1) {
      return;
    }
    this.driverRedisService.expire(driverIds);
    return this.repo.update(driverIds, {
      status: DriverStatus.Offline,
      lastSeenTimestamp: new Date(),
    });
  }
}
