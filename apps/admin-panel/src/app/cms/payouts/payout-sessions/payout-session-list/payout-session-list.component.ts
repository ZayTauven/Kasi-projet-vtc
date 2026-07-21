import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { PayoutSessionListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-payout-session-list",
  templateUrl: "./payout-session-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PayoutSessionListComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<PayoutSessionListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.payoutSessions));
  }

  statusColor(status: string): string {
    switch (status) {
      case "Processed":
        return "success";
      case "Canceled":
        return "default";
      default:
        return "processing";
    }
  }
}
