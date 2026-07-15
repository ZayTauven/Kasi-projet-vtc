import { NgModule } from '@angular/core';
import { ManagementSmsProviderRoutingModule } from './sms-provider-routing.module';
import { SmsProviderListComponent } from './sms-provider-list/sms-provider-list.component';
import { SmsProviderViewComponent } from './sms-provider-view/sms-provider-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [SmsProviderListComponent, SmsProviderViewComponent],
  imports: [ManagementSmsProviderRoutingModule, SharedModule],
})
export class ManagementSmsProviderModule {}
