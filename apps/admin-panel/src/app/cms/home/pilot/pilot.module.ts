import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { PilotComponent } from './pilot.component';

/** p3-mesures M2 : ecran « Pilote » de l'accueil (docs/fiche-mesures-pilote.md §4). */
const routes: Routes = [{ path: '', component: PilotComponent }];

@NgModule({
  declarations: [PilotComponent],
  imports: [RouterModule.forChild(routes), SharedModule],
})
export class PilotModule {}
