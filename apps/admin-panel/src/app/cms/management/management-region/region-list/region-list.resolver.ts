import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { RegionFilter, RegionListGQL, RegionListQuery, RegionSortFields, RiderFilter, RidersListGQL, RidersListQuery, RiderSortFields } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class RegionsListResolver  {
  constructor(
    private paging: TableService,
    private gql: RegionListGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<RegionListQuery>> {
    const params = this.paging.deserializeQueryParams<RegionSortFields, RegionFilter>(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
