import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  ReviewParametersListGQL,
  ReviewParametersListQuery,
  ZonePriceFilter,
  ZonePricesListGQL,
  ZonePricesListQuery,
  ZonePriceSortFields,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class ZonePricesListResolver
  
{
  constructor(private paging: TableService, private gql: ZonePricesListGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<ZonePricesListQuery>> {
    const params = this.paging.deserializeQueryParams<
      ZonePriceSortFields,
      ZonePriceFilter
    >(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
