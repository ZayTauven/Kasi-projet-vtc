import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { CouponListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-coupons-list",
  templateUrl: "./coupons-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CouponsListComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<CouponListQuery>>;

  constructor(
    public route: ActivatedRoute,
    public tableService: TableService,
    public tagColor: TagColorService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.coupons));
  }
}
