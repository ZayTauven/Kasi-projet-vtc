import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
    ComplaintFilter,
    ComplaintsListGQL,
    ComplaintsListQuery,
    ComplaintSortFields,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class ComplaintsListResolver  {
  constructor(
    private paging: TableService,
    private gql: ComplaintsListGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ComplaintsListQuery>> {
    const params = this.paging.deserializeQueryParams<ComplaintSortFields, ComplaintFilter>(route.queryParams);
    return this.gql.fetch({ variables: params });
  }
}
