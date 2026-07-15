import { NgModule } from '@angular/core';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

import { PayoutsRoutingModule } from './payouts-routing.module';

@NgModule({
  declarations: [],
  imports: [SharedModule, PayoutsRoutingModule],
})
export class PayoutsModule {}
