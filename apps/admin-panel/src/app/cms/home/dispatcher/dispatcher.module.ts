import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { DispatcherRoutingModule } from './dispatcher-routing.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DispatcherComponent } from './dispatcher.component';
import { MapboxPlacesComponent } from '@kasi/admin-panel/src/app/@components/mapbox-places.component';
import { DispatcherRidersListComponent } from './dispatcher-riders-list/dispatcher-riders-list.component';
import { DispatcherLocationsSelectComponent } from './dispatcher-locations-select/dispatcher-locations-select.component';
import { DispatcherServiceSelectComponent } from './dispatcher-service-select/dispatcher-service-select.component';
import { DispatcherLookingComponent } from './dispatcher-looking/dispatcher-looking.component';
import { DispatcherService } from './dispatcher.service';



@NgModule({
  declarations: [DispatcherComponent, MapboxPlacesComponent, DispatcherRidersListComponent, DispatcherLocationsSelectComponent, DispatcherServiceSelectComponent, DispatcherLookingComponent],
  imports: [
    CommonModule,
    DispatcherRoutingModule,
    SharedModule
  ],
  providers: [DispatcherService]
})
export class DispatcherModule { }
