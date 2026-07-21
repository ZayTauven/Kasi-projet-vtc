import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  PayoutSessionFilter,
  PayoutSessionListGQL,
  PayoutSessionListQuery,
  PayoutSessionSortFields,
  SortDirection,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class PayoutSessionListResolver {
  constructor(
    private tableService: TableService,
    private gql: PayoutSessionListGQL
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<PayoutSessionListQuery>> {
    const params = this.tableService.deserializeQueryParams<
      PayoutSessionSortFields,
      PayoutSessionFilter
    >(route.queryParams);
    params.sorting = params.sorting ?? [
      { field: PayoutSessionSortFields.Id, direction: SortDirection.Desc },
    ];
    return this.gql.fetch({ variables: params });
  }
}
