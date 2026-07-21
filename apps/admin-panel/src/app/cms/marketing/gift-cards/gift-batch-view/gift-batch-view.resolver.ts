import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewGiftBatchGQL, ViewGiftBatchQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class GiftBatchViewResolver {
  constructor(
    private gql: ViewGiftBatchGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewGiftBatchQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
