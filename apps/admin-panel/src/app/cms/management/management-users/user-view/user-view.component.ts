import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { ViewOperatorQuery } from "@kasi/admin-panel/generated/graphql";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-user-view",
  templateUrl: "./user-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UserViewComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<ViewOperatorQuery>>;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.operator));
  }
}
