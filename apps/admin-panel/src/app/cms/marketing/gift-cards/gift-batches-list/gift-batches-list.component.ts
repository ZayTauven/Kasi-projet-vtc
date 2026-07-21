import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { GiftBatchListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-gift-batches-list",
  templateUrl: "./gift-batches-list.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class GiftBatchesListComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<GiftBatchListQuery>>;

  constructor(
    public route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.giftBatches));
  }
}
