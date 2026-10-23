import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CMSComponent } from './cms.component';
import { CMSResolver } from './cms.resolver';

const routes: Routes = [
  {
    path: '',
    component: CMSComponent,
    resolve: { notifications: CMSResolver },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          {
            path: 'overview',
            loadChildren: () =>
              import('./home/overview/overview.module').then(
                (m) => m.OverviewModule
              ),
          },
          {
            path: 'dispatcher',
            loadChildren: () =>
              import('./home/dispatcher/dispatcher.module').then(
                (m) => m.DispatcherModule
              ),
          },
          {
            // p3-mesures M2 : suivi du pilote (docs/fiche-mesures-pilote.md §4).
            path: 'pilot',
            loadChildren: () =>
              import('./home/pilot/pilot.module').then((m) => m.PilotModule),
          },
        ],
      },
      {
        path: 'drivers',
        loadChildren: () =>
          import('./drivers/drivers.module').then((m) => m.DriversModule),
      },
      {
        path: 'riders',
        loadChildren: () =>
          import('./riders/riders.module').then((m) => m.RidersModule),
      },
      {
        path: 'marketing',
        loadChildren: () =>
          import('./marketing/marketing.module').then((m) => m.MarketingModule),
      },
      {
        path: 'financials',
        loadChildren: () =>
          import('./financials/financials.module').then(
            (m) => m.FinancialsModule
          ),
      },
      {
        path: 'payouts',
        loadChildren: () =>
          import('./payouts/payouts.module').then((m) => m.PayoutsModule),
      },
      {
        path: 'requests',
        loadChildren: () =>
          import('./requests/requests.module').then((m) => m.RequestsModule),
      },
      {
        // p2-dispatch D6 : demande non servie (menu des courses).
        path: 'unserved-demands',
        loadChildren: () =>
          import('./requests/unserved-demands/unserved-demands.module').then(
            (m) => m.UnservedDemandsModule,
          ),
      },
      {
        path: 'complaints',
        loadChildren: () =>
          import('./complaints/complaints.module').then(
            (m) => m.ComplaintsModule
          ),
      },
      {
        path: 'sos',
        loadChildren: () => import('./sos/sos.module').then((m) => m.SOSModule),
      },
      {
        path: 'management',
        loadChildren: () =>
          import('./management/management.module').then(
            (x) => x.ManagementModule
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CMSResolver],
})
export class CMSRoutingModule {}
