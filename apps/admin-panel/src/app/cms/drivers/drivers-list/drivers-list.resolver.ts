import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  DebtBlockedDriverIdsGQL,
  DriverFilter,
  DriversListGQL,
  DriversListQuery,
  DriverSortFields,
} from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { map, Observable, switchMap } from 'rxjs';

@Injectable()
export class DriversListResolver  {
  constructor(
    private paging: TableService,
    private gql: DriversListGQL,
    private blockedGQL: DebtBlockedDriverIdsGQL,
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<DriversListQuery>> {
    const params = this.paging.deserializeQueryParams<DriverSortFields, DriverFilter>(route.queryParams);
    if (route.queryParams['debt'] !== 'blocked') {
      return this.gql.fetch({ variables: params });
    }
    // p2-argent I3 : filtre « bloques » (au-dela du plafond de dette).
    return this.blockedGQL.fetch({ fetchPolicy: 'network-only' }).pipe(
      map((result) => result.data?.debtBlockedDriverIds ?? []),
      switchMap((ids) =>
        this.gql.fetch({
          variables: {
            ...params,
            filter: { ...(params.filter ?? {}), id: { in: ids.length > 0 ? ids : ['0'] } },
          },
        }),
      ),
    );
  }
}
