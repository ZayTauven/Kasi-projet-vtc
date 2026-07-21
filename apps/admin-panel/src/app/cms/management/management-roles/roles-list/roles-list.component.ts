import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { RoleQuery, RolesQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-roles-list",
  templateUrl: "./roles-list.component.html",
  styles: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RolesListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<RolesQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.roles));
  }
}
