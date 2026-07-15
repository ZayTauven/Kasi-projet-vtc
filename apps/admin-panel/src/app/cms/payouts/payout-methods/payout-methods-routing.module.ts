import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PayoutMethodListComponent } from './payout-method-list/payout-method-list.component';
import { PayoutMethodListResolver } from './payout-method-list/payout-method-list.resolver';
import { PayoutMethodViewComponent } from './payout-method-view/payout-method-view.component';
import { PayoutMethodViewResolver } from './payout-method-view/payout-method-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: PayoutMethodListComponent,
    resolve: { payoutMethods: PayoutMethodListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: PayoutMethodViewComponent,
    resolve: { payoutMethod: PayoutMethodViewResolver },
  },
  { path: 'new', component: PayoutMethodViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [PayoutMethodListResolver, PayoutMethodViewResolver],
})
export class PayoutMethodsRoutingModule {}
