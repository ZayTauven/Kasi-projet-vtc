import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
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
  ): Observable<ApolloQueryResult<CallMaskingProviderViewQuery>> {
    return this.gql.fetch({ id: route.params.id });
  }
}
