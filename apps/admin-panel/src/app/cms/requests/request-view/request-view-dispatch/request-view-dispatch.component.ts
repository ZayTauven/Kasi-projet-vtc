import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApolloClient } from '@apollo/client/core';
import {
  DispatchAttemptOutcome,
  DispatchAttemptsGQL,
  DispatchAttemptsQuery,
  ViewOrderQuery,
} from '@kasi/admin-panel/generated/graphql';
import { map, Observable, switchMap } from 'rxjs';

/**
 * p2-dispatch D4 (2026-10-20) : onglet « Sollicitations » de la fiche d'une
 * course. Journal du dispatch par vagues (`dispatchAttempts`), vide tant que
 * la course n'est pas passee par le mode `waves`.
 */
@Component({
  selector: 'app-request-view-dispatch',
  templateUrl: './request-view-dispatch.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewDispatchComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<DispatchAttemptsQuery>>;

  constructor(
    private route: ActivatedRoute,
    private gql: DispatchAttemptsGQL,
  ) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(
      map((data) => (data.order as ApolloClient.QueryResult<ViewOrderQuery>).data!.order!.id),
      switchMap((requestId) =>
        this.gql.fetch({ variables: { requestId }, errorPolicy: 'all' }),
      ),
    );
  }

  outcomeColor(outcome: DispatchAttemptOutcome): string {
    switch (outcome) {
      case DispatchAttemptOutcome.Accepted:
        return 'green';
      case DispatchAttemptOutcome.Rejected:
        return 'red';
      case DispatchAttemptOutcome.Expired:
      case DispatchAttemptOutcome.NoAnswer:
        return 'orange';
      default:
        return 'blue';
    }
  }
}
