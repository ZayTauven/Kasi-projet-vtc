import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import {
  RetentionPolicyViewGQL,
  RetentionPolicyViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class RetentionViewResolver {
  constructor(private gql: RetentionPolicyViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloQueryResult<RetentionPolicyViewQuery>> {
    return this.gql.fetch({ id: route.params.id });
  }
}
