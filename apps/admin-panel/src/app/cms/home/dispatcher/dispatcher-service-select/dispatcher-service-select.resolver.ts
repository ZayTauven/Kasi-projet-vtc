import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { DispatcherCalculateFareGQL, DispatcherCalculateFareQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';
import { DispatcherService } from '../dispatcher.service';

@Injectable()
export class DispatcherServiceSelectResolver  {
  constructor(
    private dispatcherService: DispatcherService,
    private gql: DispatcherCalculateFareGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<DispatcherCalculateFareQuery>> {
    const points = this.dispatcherService.deserializePoints(route.queryParams.points);
    return this.gql.fetch({ variables: {points: points.map(point => point.location)} });
  }
}
