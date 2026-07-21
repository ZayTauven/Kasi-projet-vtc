import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { CouponFilter, CouponListGQL, CouponListQuery, CouponSortFields } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class CouponsListResolver  {
  constructor(
    private paging: TableService,
    private gql: CouponListGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<CouponListQuery>> {
    const params = this.paging.deserializeQueryParams<CouponSortFields, CouponFilter>(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
