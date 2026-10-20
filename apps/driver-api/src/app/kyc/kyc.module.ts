import { Module } from '@nestjs/common';
import { DriverDocumentService } from '@kasi/order/driver-document.service';

import { DriverDocumentResolver } from './driver-document.resolver';

/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman (requetes et mutation).
 * Le controle `kyc-check` vit avec le consommateur de la file kasi-dispatch
 * (OrderModule) : un seul @Processor par file.
 */
@Module({
  providers: [DriverDocumentService, DriverDocumentResolver],
})
export class KycModule {}
