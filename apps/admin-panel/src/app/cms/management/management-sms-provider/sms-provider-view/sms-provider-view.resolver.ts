import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
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
  ): Observable<ApolloClient.QueryResult<SmsProviderViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
