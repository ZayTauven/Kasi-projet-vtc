import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CallMaskingProviderListComponent } from './call-masking-provider-list/call-masking-provider-list.component';
import { CallMaskingProviderListResolver } from './call-masking-provider-list/call-masking-provider-list.resolver';
import { CallMaskingProviderViewComponent } from './call-masking-provider-view/call-masking-provider-view.component';
import { CallMaskingProviderViewResolver } from './call-masking-provider-view/call-masking-provider-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: CallMaskingProviderListComponent,
    resolve: { callMaskingProviders: CallMaskingProviderListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: CallMaskingProviderViewComponent,
    resolve: { callMaskingProvider: CallMaskingProviderViewResolver },
  },
  { path: 'new', component: CallMaskingProviderViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CallMaskingProviderListResolver, CallMaskingProviderViewResolver],
})
export class ManagementCallMaskingProviderRoutingModule {}
