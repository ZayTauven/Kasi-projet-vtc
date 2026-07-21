import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
    RiderTransactionFilter,
    RiderTransactionSortFields,
    RiderWalletsListGQL,
    RiderWalletsListQuery,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class RiderWalletsListResolver  {
  constructor(
    private paging: TableService,
    private gql: RiderWalletsListGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<RiderWalletsListQuery>> {
    const params = this.paging.deserializeQueryParams<RiderTransactionSortFields, RiderTransactionFilter>(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
