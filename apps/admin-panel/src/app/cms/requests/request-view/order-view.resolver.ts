import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewOrderGQL, ViewOrderQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class OrderViewResolver  {
  constructor(
    private gql: ViewOrderGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewOrderQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
