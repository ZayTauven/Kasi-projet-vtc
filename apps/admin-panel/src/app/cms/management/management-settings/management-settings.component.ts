import { Component, ChangeDetectionStrategy } from "@angular/core";

/**
 * Shell d'onglets de la page "Réglages généraux" : héberge le mot de passe
 * admin ainsi que les modules configurés de façon non récurrente
 * (cartographie, passerelles de paiement, fournisseurs email), sortis du
 * menu "Gestion" pour l'alléger. Voir KASI_DECISIONS.md.
 */
@Component({
  selector: "app-management-settings",
  templateUrl: "./management-settings.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ManagementSettingsComponent {}
