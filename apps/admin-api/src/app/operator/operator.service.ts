import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { ForbiddenError } from '@nestjs/apollo';
import { Repository } from 'typeorm';

@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(OperatorEntity)
    public repo: Repository<OperatorEntity>,
  ) {}

  async validateCredentials(
    userName: string,
    password: string,
  ): Promise<OperatorEntity | null> {
    return this.repo.findOneBy({ userName, password });
  }

  async getById(id: number): Promise<OperatorEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async hasPermission(
    id: number,
    permission: OperatorPermission,
  ): Promise<OperatorEntity> {
    const operator = await this.repo.findOneOrFail({
      where: { id },
      relations: { role: true },
    });
    const hasPermission = operator.role?.permissions.includes(permission);
    if (!hasPermission) throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    return operator;
  }
}
