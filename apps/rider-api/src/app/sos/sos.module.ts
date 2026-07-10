import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisPubSubProvider } from '@kasi/database';
import { OperatorEntity } from '@kasi/database/operator.entity';
import { SOSEntity } from '@kasi/database/sos.entity';
import { SOSResolver } from './sos.resolver';
import { SOSService } from './sos.service';

@Module({
  imports: [TypeOrmModule.forFeature([SOSEntity, OperatorEntity])],
  providers: [SOSService, SOSResolver, RedisPubSubProvider.provider()],
})
export class SOSModule {}
