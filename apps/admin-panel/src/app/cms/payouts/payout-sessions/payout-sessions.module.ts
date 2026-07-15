import { NgModule } from '@angular/core';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { PayoutSessionsRoutingModule } from './payout-sessions-routing.module';
import { PayoutSessionListComponent } from './payout-session-list/payout-session-list.component';
import { PayoutSessionNewComponent } from './payout-session-new/payout-session-new.component';
import { PayoutSessionViewComponent } from './payout-session-view/payout-session-view.component';

@NgModule({
  declarations: [
    PayoutSessionListComponent,
    PayoutSessionNewComponent,
    PayoutSessionViewComponent,
  ],
  imports: [PayoutSessionsRoutingModule, SharedModule],
})
export class PayoutSessionsModule {}
