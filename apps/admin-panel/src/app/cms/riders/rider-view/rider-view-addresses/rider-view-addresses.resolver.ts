import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { RiderAddressesGQL, RiderAddressesQuery } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class RiderViewAddresssesResolver  {
  constructor(
    private gql: RiderAddressesGQL,
    private tableService: TableService
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<RiderAddressesQuery>> {
    const paging = this.tableService.deserializeQueryParams(route.queryParams);
    return this.gql.fetch({ variables: { riderId: route.parent?.params.id, paging: paging.paging } });
  }
}
