import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  RegionViewGQL,
  RegionViewQuery,
  ViewRiderQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class RegionViewResolver
  
{
  constructor(private gql: RegionViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<ApolloClient.QueryResult<RegionViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
