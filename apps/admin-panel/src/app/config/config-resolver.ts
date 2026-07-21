import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CurrentConfigurationGQL, CurrentConfigurationQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';
import { ApolloClient } from '@apollo/client/core';

@Injectable()
export class ConfigResolver  {
  constructor(
    private currentConfigGql: CurrentConfigurationGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<CurrentConfigurationQuery>> {
    return this.currentConfigGql.fetch({ variables: {} });
  }
}
