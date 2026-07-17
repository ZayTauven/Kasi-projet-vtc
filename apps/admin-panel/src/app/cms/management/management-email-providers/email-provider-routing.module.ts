import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EmailProviderListComponent } from './email-provider-list/email-provider-list.component';
import { EmailProviderListResolver } from './email-provider-list/email-provider-list.resolver';
import { EmailProviderViewComponent } from './email-provider-view/email-provider-view.component';
import { EmailProviderViewResolver } from './email-provider-view/email-provider-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: EmailProviderListComponent,
    resolve: { emailProviders: EmailProviderListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: EmailProviderViewComponent,
    resolve: { emailProvider: EmailProviderViewResolver },
  },
  { path: 'new', component: EmailProviderViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [EmailProviderListResolver, EmailProviderViewResolver],
})
export class ManagementEmailProvidersRoutingModule {}
