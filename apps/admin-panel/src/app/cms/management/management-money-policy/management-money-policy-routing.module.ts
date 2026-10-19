import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MoneyPolicyComponent } from './money-policy.component';

const routes: Routes = [{ path: '', component: MoneyPolicyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManagementMoneyPolicyRoutingModule {}
