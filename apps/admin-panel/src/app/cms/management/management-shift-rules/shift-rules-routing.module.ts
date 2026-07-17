import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ShiftRuleListComponent } from './shift-rule-list/shift-rule-list.component';
import { ShiftRuleListResolver } from './shift-rule-list/shift-rule-list.resolver';
import { ShiftRuleViewComponent } from './shift-rule-view/shift-rule-view.component';
import { ShiftRuleViewResolver } from './shift-rule-view/shift-rule-view.resolver';

const routes: Routes = [
  {
    path: '',
    component: ShiftRuleListComponent,
    resolve: { shiftRules: ShiftRuleListResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'view/:id',
    component: ShiftRuleViewComponent,
    resolve: { shiftRule: ShiftRuleViewResolver },
  },
  { path: 'new', component: ShiftRuleViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [ShiftRuleListResolver, ShiftRuleViewResolver],
})
export class ManagementShiftRulesRoutingModule {}
