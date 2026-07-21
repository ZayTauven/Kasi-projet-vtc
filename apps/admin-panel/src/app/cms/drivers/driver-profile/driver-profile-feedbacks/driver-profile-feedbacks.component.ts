import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { DriverFeedbacksQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-driver-profile-feedbacks",
  templateUrl: "./driver-profile-feedbacks.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverProfileFeedbacksComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<DriverFeedbacksQuery>>;

  constructor(
    public tagColor: TagColorService,
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}
  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.feedbacks));
  }
}
