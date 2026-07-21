import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewServiceGQL, ViewServiceQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ManagementServicesViewResolver  {
    constructor(
        private gql: ViewServiceGQL
    ) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewServiceQuery>> {
        return this.gql.fetch({ variables: { id: route.params.id } });
    }
}
