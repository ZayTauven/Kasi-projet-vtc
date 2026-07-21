import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  PayoutSessionViewGQL,
  PayoutSessionViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class PayoutSessionViewResolver {
  constructor(private gql: PayoutSessionViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<PayoutSessionViewQuery>> {
    return this.gql.fetch(
      { variables: { id: route.params.id }, fetchPolicy: 'network-only' }
    );
  }
}
