import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RetentionListComponent } from './retention-list/retention-list.component';
import { RetentionListResolver } from './retention-list/retention-list.resolver';
import { RetentionViewComponent } from './retention-view/retention-view.component';
import { RetentionViewResolver } from './retention-view/retention-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: RetentionListComponent,
    resolve: { retentionPolicies: RetentionListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: RetentionViewComponent,
    resolve: { retentionPolicy: RetentionViewResolver },
  },
  { path: 'new', component: RetentionViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [RetentionListResolver, RetentionViewResolver],
})
export class ManagementRetentionRoutingModule {}
