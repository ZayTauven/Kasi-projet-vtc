import { ForbiddenError } from '@nestjs/apollo';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorPermission } from '@kasi/database/enums/operator-permission.enum';
import { MapSettingEntity } from '@kasi/database/map-setting.entity';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MapSettingDTO } from './dto/map-setting.dto';
import { UpdateMapSettingInput } from './dto/map-setting.input';
import { MapSettingService } from './map-setting.service';

// Resolver custom (singleton, pas de CRUD nestjs-query). L'enforcement des
// permissions est fait manuellement ici, comme dans gift.resolver, car un
// @Resolver custom n'est pas enveloppé par l'AuthorizerInterceptor de
// nestjs-query : MapSettings_View pour lire, MapSettings_Edit pour éditer.
@Resolver()
@UseGuards(JwtAuthGuard)
export class MapSettingResolver {
  constructor(
    private mapSettingService: MapSettingService,
    @InjectRepository(OperatorEntity)
    private operatorRepository: Repository<OperatorEntity>,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  private async assertPermission(
    permission: OperatorPermission,
  ): Promise<void> {
    const operator = await this.operatorRepository.findOne({
      where: { id: this.context.req.user.id },
      relations: { role: true },
    });
    if (!operator.role?.permissions.includes(permission)) {
      throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    }
  }

  @Query(() => MapSettingDTO)
  async mapSetting(): Promise<MapSettingEntity> {
    await this.assertPermission(OperatorPermission.MapSettings_View);
    return this.mapSettingService.get();
  }

  @Mutation(() => MapSettingDTO)
  async updateMapSetting(
    @Args('input', { type: () => UpdateMapSettingInput })
    input: UpdateMapSettingInput,
  ): Promise<MapSettingEntity> {
    await this.assertPermission(OperatorPermission.MapSettings_Edit);
    return this.mapSettingService.update(input);
  }
}
