import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { ViewOrderQuery } from "@kasi/admin-panel/generated/graphql";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-request-view-financials",
  templateUrl: "./request-view-financials.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewFinancialsComponent implements OnInit {
  query?: Observable<ApolloQueryResult<ViewOrderQuery>>;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(map((data) => data.order));
  }
}
