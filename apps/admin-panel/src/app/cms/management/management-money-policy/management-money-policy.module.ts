import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { ManagementMoneyPolicyRoutingModule } from './management-money-policy-routing.module';
import { MoneyPolicyComponent } from './money-policy.component';

/** p2-argent I3 : reglage du plafond de dette des Kasimen (onglet des reglages). */
@NgModule({
  declarations: [MoneyPolicyComponent],
  imports: [CommonModule, ManagementMoneyPolicyRoutingModule, SharedModule],
})
export class ManagementMoneyPolicyModule {}
