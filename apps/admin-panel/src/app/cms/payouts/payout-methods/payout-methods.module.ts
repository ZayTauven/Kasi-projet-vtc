import { NgModule } from '@angular/core';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { PayoutMethodsRoutingModule } from './payout-methods-routing.module';
import { PayoutMethodListComponent } from './payout-method-list/payout-method-list.component';
import { PayoutMethodViewComponent } from './payout-method-view/payout-method-view.component';

@NgModule({
  declarations: [PayoutMethodListComponent, PayoutMethodViewComponent],
  imports: [PayoutMethodsRoutingModule, SharedModule],
})
export class PayoutMethodsModule {}
