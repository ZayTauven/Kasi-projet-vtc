import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewSosGQL, ViewSosQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class SOSViewResolver  {
  constructor(
    private gql: ViewSosGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewSosQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
