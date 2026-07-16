import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallMaskingProviderEntity } from '@kasi/database/call-masking-provider.entity';
import { CallMaskingService } from './call-masking.service';

// Module partagé exposant CallMaskingService (voix / call masking). Importé par
// l'OrderModule de rider-api ET driver-api, ainsi que par le module admin de
// gestion des providers. Redis est fourni globalement par RedisModule.forRoot.
@Module({
  imports: [TypeOrmModule.forFeature([CallMaskingProviderEntity])],
  providers: [CallMaskingService],
  exports: [CallMaskingService],
})
export class CallMaskingModule {}
