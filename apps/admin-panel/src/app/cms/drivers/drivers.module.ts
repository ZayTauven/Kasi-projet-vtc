import { NgModule } from '@angular/core';

import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { DriverNewComponent } from './driver-new/driver-new.component';
import { DriversListComponent } from './drivers-list/drivers-list.component';
import { DriversRoutingModule } from './drivers-routing.module';


@NgModule({
  declarations: [DriversListComponent, DriverNewComponent],
  imports: [
    SharedModule,
    DriversRoutingModule
  ]
})
export class DriversModule { }
