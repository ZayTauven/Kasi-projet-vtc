import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { TranslateService } from "@ngx-translate/core";
import {
  DriversListQuery,
  DriverStatus,
} from "@kasi/admin-panel/generated/graphql";
import {
  debtStatusOf,
  debtTagColor,
  DebtStatus,
} from "@kasi/admin-panel/src/app/@services/debt-status";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { camelCase } from "camel-case";
import { map, Observable } from "rxjs";

import { TableService } from "../../../@services/table-service";

@Component({
  selector: "app-drivers-list",
  templateUrl: "./drivers-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriversListComponent implements OnInit {
  statuses: { text: string; value: string }[] = Object.values(DriverStatus).map(
    (key) => ({
      value: key,
      text: this.translator.instant(`enum.driver.status.${camelCase(key)}`),
    }),
  );
  query?: Observable<ApolloClient.QueryResult<DriversListQuery>>;
  toCamelCase = camelCase;
  debtTagColor = debtTagColor;

  constructor(
    public tagColor: TagColorService,
    public tableService: TableService,
    public route: ActivatedRoute,
    private translator: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.drivers));
  }

  /** p2-argent I3 : dette et statut (normal, alerte, bloque) d'une ligne. */
  debtOf(
    wallets: { balance: number; currency: string }[] | null | undefined,
    policies: DriversListQuery["moneyPolicies"] | undefined,
  ): DebtStatus | null {
    return debtStatusOf(wallets, policies);
  }

  get blockedOnly(): boolean {
    return this.route.snapshot.queryParams["debt"] === "blocked";
  }

  /** Filtre « bloques » : parametre d'URL `debt=blocked`, retour en page 1. */
  setBlockedOnly(value: boolean) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { debt: value ? "blocked" : undefined, pageIndex: 1 },
      queryParamsHandling: "merge",
    });
  }
}
