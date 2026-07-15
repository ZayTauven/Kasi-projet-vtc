import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'sessions', pathMatch: 'full' },
  {
    path: 'sessions',
    loadChildren: () =>
      import('./payout-sessions/payout-sessions.module').then(
        (m) => m.PayoutSessionsModule
      ),
  },
  {
    path: 'methods',
    loadChildren: () =>
      import('./payout-methods/payout-methods.module').then(
        (m) => m.PayoutMethodsModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PayoutsRoutingModule {}
