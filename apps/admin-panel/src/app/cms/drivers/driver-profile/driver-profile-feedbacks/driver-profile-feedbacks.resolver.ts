import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { DriverFeedbacksGQL, DriverFeedbacksQuery } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { Observable } from 'rxjs';

@Injectable()
export class DriverProfileFeedbacksResolver  {
  constructor(
    private gql: DriverFeedbacksGQL,
    private tableService: TableService
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<DriverFeedbacksQuery>> {
    const paging = this.tableService.deserializeQueryParams(route.queryParams);
    return this.gql.fetch({ variables: { id: route.parent?.params.id, paging: paging.paging } });
  }
}
