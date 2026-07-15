import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PayoutSessionListComponent } from './payout-session-list/payout-session-list.component';
import { PayoutSessionListResolver } from './payout-session-list/payout-session-list.resolver';
import { PayoutSessionNewComponent } from './payout-session-new/payout-session-new.component';
import { PayoutSessionViewComponent } from './payout-session-view/payout-session-view.component';
import { PayoutSessionViewResolver } from './payout-session-view/payout-session-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: PayoutSessionListComponent,
    resolve: { payoutSessions: PayoutSessionListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: PayoutSessionViewComponent,
    resolve: { payoutSession: PayoutSessionViewResolver },
  },
  { path: 'new', component: PayoutSessionNewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [PayoutSessionListResolver, PayoutSessionViewResolver],
})
export class PayoutSessionsRoutingModule {}
