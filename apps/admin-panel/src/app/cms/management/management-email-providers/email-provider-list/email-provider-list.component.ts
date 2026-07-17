import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import { EmailProviderListQuery } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-email-provider-list',
  templateUrl: './email-provider-list.component.html',
})
export class EmailProviderListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<EmailProviderListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.emailProviders));
  }
}
