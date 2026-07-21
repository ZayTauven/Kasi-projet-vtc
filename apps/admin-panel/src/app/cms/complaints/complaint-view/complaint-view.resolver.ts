import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewComplaintGQL, ViewComplaintQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ComplaintViewResolver  {
  constructor(
    private gql: ViewComplaintGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewComplaintQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
