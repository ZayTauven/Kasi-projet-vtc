import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewDriverGQL, ViewDriverQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class DriverProfileResolver  {
  constructor(
    private gql: ViewDriverGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewDriverQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
