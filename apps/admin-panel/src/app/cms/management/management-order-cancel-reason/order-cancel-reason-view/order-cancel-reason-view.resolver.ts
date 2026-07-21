import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  OrderCancelReasonViewGQL,
  OrderCancelReasonViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class OrderCancelReasonViewResolver {
  constructor(private gql: OrderCancelReasonViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<OrderCancelReasonViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
