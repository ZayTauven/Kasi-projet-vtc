import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  ViewAnnouncementGQL,
  ViewAnnouncementQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class AnnouncementViewResolver
  
{
  constructor(private gql: ViewAnnouncementGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ApolloClient.QueryResult<ViewAnnouncementQuery>> {
    return this.gql.fetch({ variables: { id: route.params.id } });
  }
}
