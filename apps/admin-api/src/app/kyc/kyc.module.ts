import { Module } from '@nestjs/common';
import { DriverDocumentService } from '@kasi/order/driver-document.service';

import { AdminDriverDocumentResolver } from './driver-document.resolver';

/** p2-kyc K1 (2026-10-20) : catalogue et revue des documents types du Kasiman. */
@Module({
  providers: [DriverDocumentService, AdminDriverDocumentResolver],
})
export class KycModule {}
