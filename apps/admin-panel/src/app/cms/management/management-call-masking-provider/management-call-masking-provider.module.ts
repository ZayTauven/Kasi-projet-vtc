import { NgModule } from '@angular/core';
import { ManagementCallMaskingProviderRoutingModule } from './call-masking-provider-routing.module';
import { CallMaskingProviderListComponent } from './call-masking-provider-list/call-masking-provider-list.component';
import { CallMaskingProviderViewComponent } from './call-masking-provider-view/call-masking-provider-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [
    CallMaskingProviderListComponent,
    CallMaskingProviderViewComponent,
  ],
  imports: [ManagementCallMaskingProviderRoutingModule, SharedModule],
})
export class ManagementCallMaskingProviderModule {}
