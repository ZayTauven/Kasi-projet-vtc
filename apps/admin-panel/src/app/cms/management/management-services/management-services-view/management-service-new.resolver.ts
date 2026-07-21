import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  NewServiceGQL,
  NewServiceQuery,
  ViewRiderQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ManagementServiceNewResolver
  
{
  constructor(private gql: NewServiceGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<ApolloClient.QueryResult<NewServiceQuery>> {
    return this.gql.fetch();
  }
}
