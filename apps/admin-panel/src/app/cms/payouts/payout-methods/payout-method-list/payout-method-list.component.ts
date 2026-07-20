import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { PayoutMethodListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-payout-method-list",
  templateUrl: "./payout-method-list.component.html",
  standalone: false,
})
export class PayoutMethodListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<PayoutMethodListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.payoutMethods));
  }
}
