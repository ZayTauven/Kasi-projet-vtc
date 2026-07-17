import { NgModule } from '@angular/core';
import { ManagementEmailProvidersRoutingModule } from './email-provider-routing.module';
import { EmailProviderListComponent } from './email-provider-list/email-provider-list.component';
import { EmailProviderViewComponent } from './email-provider-view/email-provider-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [EmailProviderListComponent, EmailProviderViewComponent],
  imports: [ManagementEmailProvidersRoutingModule, SharedModule],
})
export class ManagementEmailProvidersModule {}
