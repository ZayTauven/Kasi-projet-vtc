import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { ViewOrderQuery } from "@kasi/admin-panel/generated/graphql";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-request-view-complaints",
  templateUrl: "./request-view-complaints.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewComplaintsComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<ViewOrderQuery>>;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(map((data) => data.order));
  }
}
