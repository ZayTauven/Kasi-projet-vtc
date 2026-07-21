import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { Params, ActivatedRoute, Router } from "@angular/router";
import { NzMessageService } from "ng-zorro-antd/message";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { Observable } from "rxjs";
import { ApolloClient } from "@apollo/client/core";
import {
  OrderCancelReasonListQuery,
  ReviewParametersListQuery,
} from "@kasi/admin-panel/generated/graphql";
import { map } from "rxjs/operators";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";

@Component({
  selector: "app-review-parameters-list",
  templateUrl: "./order-cancel-reason-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OrderCancelReasonListComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<OrderCancelReasonListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
    public tagColor: TagColorService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.orderCancelReasons));
  }
}
