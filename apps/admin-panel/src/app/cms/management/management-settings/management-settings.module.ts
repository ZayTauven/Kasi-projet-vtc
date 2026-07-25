import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ManagementSettingsRoutingModule } from './management-settings-routing.module';
import { ManagementSettingsComponent } from './management-settings.component';
import { ManagementSettingsPasswordComponent } from './management-settings-password/management-settings-password.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';


@NgModule({
  declarations: [ManagementSettingsComponent, ManagementSettingsPasswordComponent],
  imports: [
    CommonModule,
    ManagementSettingsRoutingModule,
    SharedModule
  ]
})
export class ManagementSettingsModule { }
