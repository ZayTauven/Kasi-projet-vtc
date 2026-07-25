import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { TranslateService } from "@ngx-translate/core";
import {
  ComplaintActivityType,
  ViewComplaintQuery,
} from "@kasi/admin-panel/generated/graphql";
import { NzTimelineItemColor } from "ng-zorro-antd/timeline";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-complaint-view-records",
  templateUrl: "./complaint-view-records.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ComplaintViewRecordsComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<ViewComplaintQuery>>;

  constructor(
    private route: ActivatedRoute,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(map((data) => data.complaint));
  }

  getColor(type: ComplaintActivityType): NzTimelineItemColor {
    switch (type) {
      case ComplaintActivityType.Resolved:
        return "green";

      case ComplaintActivityType.AssignToOperator:
        return "blue";

      default:
        return "gray";
    }
  }

  translateType(value: ComplaintActivityType): string {
    switch (value) {
      case ComplaintActivityType.AssignToOperator:
        return this.translateService.instant(
          "complaintActivityType.assignToOperator",
        );
      case ComplaintActivityType.Resolved:
        return this.translateService.instant(
          "complaintActivityType.resolved",
        );
      case ComplaintActivityType.Update:
        return this.translateService.instant("complaintActivityType.update");
    }
  }

  isPending(items: { type: ComplaintActivityType }[]): boolean {
    if (items.length == 0) return false;
    const lastItem = items[items.length - 1];
    return lastItem.type !== ComplaintActivityType.Resolved;
  }
}
