import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewOperatorGQL, ViewOperatorQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class OperatorViewResolver  {
  constructor(
    private gql: ViewOperatorGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewOperatorQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
