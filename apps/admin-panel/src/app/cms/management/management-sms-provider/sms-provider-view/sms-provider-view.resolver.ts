import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import {
  SmsProviderViewGQL,
  SmsProviderViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class SmsProviderViewResolver {
  constructor(private gql: SmsProviderViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloQueryResult<SmsProviderViewQuery>> {
    return this.gql.fetch({ id: route.params.id });
  }
}
