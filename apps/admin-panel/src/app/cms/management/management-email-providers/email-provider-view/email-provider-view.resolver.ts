import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import {
  EmailProviderViewGQL,
  EmailProviderViewQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class EmailProviderViewResolver {
  constructor(private gql: EmailProviderViewGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloQueryResult<EmailProviderViewQuery>> {
    return this.gql.fetch({ id: route.params.id });
  }
}
