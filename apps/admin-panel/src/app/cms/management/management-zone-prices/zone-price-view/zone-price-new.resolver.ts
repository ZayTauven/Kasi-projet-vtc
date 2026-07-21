import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  ZonePriceNewGQL,
  ZonePriceNewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ZonePriceNewResolver
  
{
  constructor(private gql: ZonePriceNewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<ZonePriceNewQuery>> {
    return this.gql.fetch();
  }
}
