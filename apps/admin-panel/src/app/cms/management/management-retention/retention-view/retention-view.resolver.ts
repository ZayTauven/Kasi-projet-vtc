import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
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
  ): Observable<ApolloClient.QueryResult<RetentionPolicyViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
