import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  CallMaskingProviderViewGQL,
  CallMaskingProviderViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class CallMaskingProviderViewResolver {
  constructor(private gql: CallMaskingProviderViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<CallMaskingProviderViewQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
