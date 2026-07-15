import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import {
  SmsProviderListGQL,
  SmsProviderListQuery,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class SmsProviderListResolver {
  constructor(
    private tableService: TableService,
    private gql: SmsProviderListGQL
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloQueryResult<SmsProviderListQuery>> {
    const params = this.tableService.deserializeQueryParams(route.queryParams);
    return this.gql.fetch(params);
  }
}
