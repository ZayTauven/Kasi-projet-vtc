import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewServiceCategoryGQL, ViewServiceCategoryQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ManagementServicesCategoryViewResolver  {
    constructor(
        private gql: ViewServiceCategoryGQL
    ) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewServiceCategoryQuery>> {
        return this.gql.fetch({ variables: { id: route.params.id } });
    }
}
