import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

import { DocumentTypesComponent } from './document-types.component';

const routes: Routes = [{ path: '', component: DocumentTypesComponent }];

/** p2-kyc K2 : catalogue des documents du Kasiman. */
@NgModule({
  declarations: [DocumentTypesComponent],
  imports: [RouterModule.forChild(routes), SharedModule],
})
export class ManagementDocumentTypesModule {}
