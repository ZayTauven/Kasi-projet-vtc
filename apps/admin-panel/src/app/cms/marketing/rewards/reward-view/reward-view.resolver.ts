import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewRewardGQL, ViewRewardQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class RewardViewResolver  {
  constructor(
    private gql: ViewRewardGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewRewardQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
