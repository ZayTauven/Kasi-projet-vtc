import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ObservableQuery } from '@apollo/client/core';
import {
  NotificationsGQL,
  NotificationsQuery,
} from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class CMSResolver
  
{
  constructor(private gql: NotificationsGQL) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ObservableQuery.Result<NotificationsQuery>> {
    return this.gql.watch({ variables: {} }).valueChanges;
  }
}
