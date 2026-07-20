import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { SmsProviderListQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { map, Observable } from "rxjs";

@Component({
  selector: "app-sms-provider-list",
  templateUrl: "./sms-provider-list.component.html",
  standalone: false,
})
export class SmsProviderListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<SmsProviderListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.smsProviders));
  }
}
