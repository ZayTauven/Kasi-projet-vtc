import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ReviewParameterViewQuery, ReviewParameterViewGQL } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class ReviewParameterViewResolver  {
    constructor(
        private gql: ReviewParameterViewGQL
    ) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ReviewParameterViewQuery>> {
        return this.gql.fetch({ variables: { id: route.params.id } });
    }
}
