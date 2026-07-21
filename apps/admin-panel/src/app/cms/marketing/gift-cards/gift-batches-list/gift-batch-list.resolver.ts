import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { GiftBatchFilter, GiftBatchListGQL, GiftBatchListQuery, GiftBatchSortFields } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class GiftBatchListResolver {
  constructor(
    private paging: TableService,
    private gql: GiftBatchListGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<GiftBatchListQuery>> {
    const params = this.paging.deserializeQueryParams<GiftBatchSortFields, GiftBatchFilter>(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
