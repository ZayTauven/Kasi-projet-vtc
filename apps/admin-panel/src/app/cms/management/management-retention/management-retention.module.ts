import { NgModule } from '@angular/core';
import { ManagementRetentionRoutingModule } from './retention-routing.module';
import { RetentionListComponent } from './retention-list/retention-list.component';
import { RetentionViewComponent } from './retention-view/retention-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [RetentionListComponent, RetentionViewComponent],
  imports: [ManagementRetentionRoutingModule, SharedModule],
})
export class ManagementRetentionModule {}
