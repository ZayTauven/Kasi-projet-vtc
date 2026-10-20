import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { UnservedDemandsComponent } from './unserved-demands.component';

/** p2-dispatch D6 (2026-10-20) : route `/unserved-demands`. */
@NgModule({
  declarations: [UnservedDemandsComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: UnservedDemandsComponent }]),
  ],
})
export class UnservedDemandsModule {}
