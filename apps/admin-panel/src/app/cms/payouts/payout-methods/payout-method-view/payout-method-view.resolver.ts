import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  PayoutMethodViewGQL,
  PayoutMethodViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class PayoutMethodViewResolver {
  constructor(private gql: PayoutMethodViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<PayoutMethodViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
