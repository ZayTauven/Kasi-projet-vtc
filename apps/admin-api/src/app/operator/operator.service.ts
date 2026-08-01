import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { hashPassword, isPasswordHashed, verifyPassword } from '@kasi/database';
import { ForbiddenError } from '@nestjs/apollo';
import { Repository } from 'typeorm';

@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(OperatorEntity)
    public repo: Repository<OperatorEntity>,
  ) {}

  /**
   * Verifiait auparavant les identifiants via
   * `repo.findOneBy({ userName, password })`, soit une comparaison du mot de
   * passe EN CLAIR executee en SQL. On charge desormais le compte par son seul
   * identifiant, puis on verifie l'empreinte en memoire, a temps constant.
   *
   * Les mots de passe encore en clair (comptes anterieurs au correctif) sont
   * acceptes une derniere fois puis immediatement re-enregistres sous forme
   * d'empreinte : la migration se fait a la premiere connexion, sans verrouiller
   * qui que ce soit hors du panel.
   */
  async validateCredentials(
    userName: string,
    password: string,
  ): Promise<OperatorEntity | null> {
    const operator = await this.repo.findOneBy({ userName });
    if (operator == null) return null;

    const stored = operator.password;
    if (!(await verifyPassword(password, stored))) return null;

    if (!isPasswordHashed(stored)) {
      const hashed = await hashPassword(password);
      await this.repo.update(operator.id, { password: hashed });
      operator.password = hashed;
    }
    return operator;
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
