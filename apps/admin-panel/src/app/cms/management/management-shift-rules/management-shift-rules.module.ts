import { NgModule } from '@angular/core';
import { ManagementShiftRulesRoutingModule } from './shift-rules-routing.module';
import { ShiftRuleListComponent } from './shift-rule-list/shift-rule-list.component';
import { ShiftRuleViewComponent } from './shift-rule-view/shift-rule-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [ShiftRuleListComponent, ShiftRuleViewComponent],
  imports: [ManagementShiftRulesRoutingModule, SharedModule],
})
export class ManagementShiftRulesModule {}
