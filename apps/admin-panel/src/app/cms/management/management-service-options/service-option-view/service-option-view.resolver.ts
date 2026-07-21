import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ServiceOptionViewQuery, ServiceOptionViewGQL } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ServiceOptionViewResolver  {
    constructor(
        private gql: ServiceOptionViewGQL
    ) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ServiceOptionViewQuery>> {
        return this.gql.fetch({ variables: { id: route.params.id } });
    }
}
