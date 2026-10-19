import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ManagementSettingsComponent } from './management-settings.component';
import { ManagementSettingsPasswordComponent } from './management-settings-password/management-settings-password.component';

// Onglets routés de la page "Réglages généraux" : mot de passe admin
// (composant local) + 3 modules "configurés de façon non récurrente"
// sortis du menu "Gestion" (cartographie, passerelles de paiement,
// fournisseurs email), chargés en lazy sans modification de leur code
// interne (routerLink/goToParent relatifs). Voir KASI_DECISIONS.md.
const routes: Routes = [
  {
    path: '',
    component: ManagementSettingsComponent,
    children: [
      { path: '', redirectTo: 'password', pathMatch: 'full' },
      { path: 'password', component: ManagementSettingsPasswordComponent },
      {
        path: 'map',
        loadChildren: () =>
          import('../management-map-settings/management-map-settings.module').then(
            (x) => x.ManagementMapSettingsModule
          ),
      },
      {
        // p2-argent I3 : plafond de dette et seuil d'alerte des Kasimen.
        path: 'debt-limit',
        loadChildren: () =>
          import('../management-money-policy/management-money-policy.module').then(
            (x) => x.ManagementMoneyPolicyModule
          ),
      },
      {
        path: 'payment-gateways',
        loadChildren: () =>
          import('../management-payment-gateways/management-payment-gateways.module').then(
            (x) => x.ManagementPaymentGatewaysModule
          ),
      },
      {
        path: 'email-providers',
        loadChildren: () =>
          import('../management-email-providers/management-email-providers.module').then(
            (x) => x.ManagementEmailProvidersModule
          ),
      },
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagementSettingsRoutingModule { }
