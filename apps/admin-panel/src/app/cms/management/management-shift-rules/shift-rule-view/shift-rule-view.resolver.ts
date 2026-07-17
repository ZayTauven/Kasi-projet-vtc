import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
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
  ): Observable<ApolloQueryResult<ShiftRuleViewQuery>> {
    return this.gql.fetch({ id: route.params.id });
  }
}
