import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import {
  ExpiringDriverDocumentsGQL,
  ExpiringDriverDocumentsQuery,
} from "@kasi/admin-panel/generated/graphql";
import { financialErrorMessage } from "@kasi/admin-panel/src/app/@services/debt-status";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

/**
 * p2-kyc K2 (2026-10-20, fiche KYC §4) : documents valides qui expirent
 * d'ici N jours, pour relancer les Kasimen avant la suspension.
 */
@Component({
  selector: "app-driver-documents-expiring",
  templateUrl: "./driver-documents-expiring.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverDocumentsExpiringComponent implements OnInit {
  readonly windows = [7, 14, 30, 60, 90];
  withinDays = 30;
  loading = false;
  rows: ExpiringDriverDocumentsQuery["expiringDriverDocuments"] = [];

  constructor(
    private gql: ExpiringDriverDocumentsGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const result = await firstValueFrom(this.gql.fetch({ variables: { withinDays: this.withinDays } }));
      this.rows = result.data?.expiringDriverDocuments ?? [];
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.loading = false;
    }
  }

  color(daysLeft: number): string {
    if (daysLeft <= 3) return "error";
    if (daysLeft <= 14) return "warning";
    return "default";
  }
}
