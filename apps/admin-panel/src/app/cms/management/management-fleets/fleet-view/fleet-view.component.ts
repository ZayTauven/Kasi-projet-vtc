import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { map, Observable } from "rxjs";
import { ApolloClient } from "@apollo/client/core";
import { ViewFleetQuery } from "@kasi/admin-panel/generated/graphql";

@Component({
  selector: "app-fleet-view",
  templateUrl: "./fleet-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FleetViewComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<ViewFleetQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tagColor: TagColorService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.fleet));
  }
}
