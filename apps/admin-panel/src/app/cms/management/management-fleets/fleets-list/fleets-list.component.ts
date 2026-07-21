import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import {
  FleetFilter,
  FleetsListQuery,
} from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-fleets-list",
  templateUrl: "./fleets-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FleetsListComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<FleetsListQuery>>;
  nameSearchValue?: string;

  constructor(
    public route: ActivatedRoute,
    private router: Router,
    public tagColor: TagColorService,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.fleets));
  }

  async filter() {
    const search: FleetFilter = {
      name: this.nameSearchValue ? { like: this.nameSearchValue } : undefined,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: JSON.stringify(search) },
      queryParamsHandling: "merge",
    });
  }
}
