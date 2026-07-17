import { Filter } from '@ptc-org/nestjs-query-core';
import {
  CustomAuthorizer,
  AuthorizationContext,
} from '@ptc-org/nestjs-query-graphql';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { DataSource } from 'typeorm';
import { UserContext } from '../../auth/authenticated-admin';

// Exposition des CODES de cartes cadeaux = GiftCards_ViewCodes, permission
// dédiée plus sensible que la simple lecture des lots. S'applique aussi bien
// à la requête top-level giftCards qu'à la relation batch->giftCards.
@Injectable()
export class GiftCardAuthorizer implements CustomAuthorizer<any> {
  constructor(private datasource: DataSource) {}

  async authorize(
    context: UserContext,
    authorizerContext: AuthorizationContext,
  ): Promise<Filter<any>> {
    const operator = await this.datasource
      .getRepository(OperatorEntity)
      .findOne({
        where: { id: context.req.user.id },
        relations: { role: true },
      });
    if (
      !operator.role?.permissions.includes(
        OperatorPermission.GiftCards_ViewCodes,
      )
    ) {
      throw new UnauthorizedException();
    }
    return undefined;
  }
}
