import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  ZonePriceViewGQL,
  ZonePriceViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ZonePriceViewResolver
  
{
  constructor(private gql: ZonePriceViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<ZonePriceViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
