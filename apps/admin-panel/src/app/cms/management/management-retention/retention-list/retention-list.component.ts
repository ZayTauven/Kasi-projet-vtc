import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { ManagementRetentionPoliciesQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-retention-list",
  templateUrl: "./retention-list.component.html",
  standalone: false,
})
export class RetentionListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<ManagementRetentionPoliciesQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.retentionPolicies));
  }
}
