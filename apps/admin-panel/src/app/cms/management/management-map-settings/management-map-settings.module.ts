import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManagementMapSettingsRoutingModule } from './management-map-settings-routing.module';
import { MapSettingsComponent } from './map-settings.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [MapSettingsComponent],
  imports: [CommonModule, ManagementMapSettingsRoutingModule, SharedModule],
})
export class ManagementMapSettingsModule {}
