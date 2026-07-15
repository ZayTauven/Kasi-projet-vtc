import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SmsProviderListComponent } from './sms-provider-list/sms-provider-list.component';
import { SmsProviderListResolver } from './sms-provider-list/sms-provider-list.resolver';
import { SmsProviderViewComponent } from './sms-provider-view/sms-provider-view.component';
import { SmsProviderViewResolver } from './sms-provider-view/sms-provider-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: SmsProviderListComponent,
    resolve: { smsProviders: SmsProviderListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: SmsProviderViewComponent,
    resolve: { smsProvider: SmsProviderViewResolver },
  },
  { path: 'new', component: SmsProviderViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [SmsProviderListResolver, SmsProviderViewResolver],
})
export class ManagementSmsProviderRoutingModule {}
