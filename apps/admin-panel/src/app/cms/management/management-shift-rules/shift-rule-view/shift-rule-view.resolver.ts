import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  ShiftRuleViewGQL,
  ShiftRuleViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ShiftRuleViewResolver {
  constructor(private gql: ShiftRuleViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<ShiftRuleViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
