import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { Observable } from "rxjs";
import { ApolloQueryResult } from "@apollo/client/core";
import { ZonePricesListQuery } from "@kasi/admin-panel/generated/graphql";
import { map } from "rxjs/operators";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";

@Component({
  selector: "app-zone-prices-list",
  templateUrl: "./zone-prices-list.component.html",
  standalone: false,
})
export class ZonePricesListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<ZonePricesListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
    public tagColor: TagColorService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.zonePrices));
  }
}
