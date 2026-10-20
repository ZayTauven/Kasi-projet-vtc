import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ApolloClient } from '@apollo/client/core';
import { UnservedDemandsGQL, UnservedDemandsQuery } from '@kasi/admin-panel/generated/graphql';
import { Observable } from 'rxjs';

/**
 * p2-dispatch D6 (2026-10-20) : liste « Demande non servie » (courses passees
 * en « aucun Kasiman » apres les vagues), 7 derniers jours par defaut cote API.
 * La carte des zones de forte demande releve de `p4-pilotage`.
 */
@Component({
  selector: 'app-unserved-demands',
  templateUrl: './unserved-demands.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UnservedDemandsComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<UnservedDemandsQuery>>;

  constructor(private gql: UnservedDemandsGQL) {}

  ngOnInit(): void {
    this.query = this.gql.fetch({ variables: { limit: 500 }, errorPolicy: 'all' });
  }

  serviceName(data: UnservedDemandsQuery | undefined, serviceId: string): string {
    return data?.services.find((s) => s.id === serviceId)?.name ?? '#' + serviceId;
  }
}
