import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DriverNewComponent } from './driver-new/driver-new.component';
import { DriversListComponent } from './drivers-list/drivers-list.component';
import { DriversListResolver } from './drivers-list/drivers-list.resolver';
import { DriverDocumentsExpiringComponent } from './driver-documents-expiring/driver-documents-expiring.component';

const routes: Routes = [
  { path: '', component: DriversListComponent, resolve: {drivers: DriversListResolver}, runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: 'view/:id', loadChildren: () => import('./driver-profile/driver-profile.module').then(m => m.DriverProfileModule)},
  { path: 'new', component: DriverNewComponent },
  // p2-kyc K2 : documents qui expirent bientot.
  { path: 'expiring-documents', component: DriverDocumentsExpiringComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    DriversListResolver
  ]
})
export class DriversRoutingModule { }
