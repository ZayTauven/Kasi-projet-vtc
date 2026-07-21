import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  EmailProviderListGQL,
  EmailProviderListQuery,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class EmailProviderListResolver {
  constructor(
    private tableService: TableService,
    private gql: EmailProviderListGQL
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<EmailProviderListQuery>> {
    const params = this.tableService.deserializeQueryParams(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
