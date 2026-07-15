import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
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
  ): Observable<ApolloQueryResult<PayoutSessionViewQuery>> {
    return this.gql.fetch(
      { id: route.params.id },
      { fetchPolicy: 'network-only' }
    );
  }
}
