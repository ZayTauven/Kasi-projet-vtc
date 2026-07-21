import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import { ViewPaymentGatewayGQL, ViewPaymentGatewayQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class PaymentGatewayViewResolver  {
  constructor(
    private gql: ViewPaymentGatewayGQL
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ApolloClient.QueryResult<ViewPaymentGatewayQuery>> {
    return this.gql.fetch({ variables: {id: route.params.id} });
  }
}
