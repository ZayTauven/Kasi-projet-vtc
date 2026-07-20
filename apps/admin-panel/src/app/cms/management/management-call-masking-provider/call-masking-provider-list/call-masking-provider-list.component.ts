import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { CallMaskingProviderListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-call-masking-provider-list",
  templateUrl: "./call-masking-provider-list.component.html",
  standalone: false,
})
export class CallMaskingProviderListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<CallMaskingProviderListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.callMaskingProviders));
  }
}
