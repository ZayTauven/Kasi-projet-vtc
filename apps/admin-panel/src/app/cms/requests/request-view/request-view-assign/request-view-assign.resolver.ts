import { Injectable } from '@angular/core';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { AvailableDriversForOrderGQL, AvailableDriversForOrderQuery, ViewOrderQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable, of } from 'rxjs';

@Injectable()
export class RequestViewAssignResolver  {
  constructor(
    private gql: AvailableDriversForOrderGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<AvailableDriversForOrderQuery>> {
    const order: ApolloClient.QueryResult<ViewOrderQuery> = route.parent!.data.order;
    return this.gql.fetch({ variables: { center: order.data!.order!.points[0],count: 10} });
  }
}
