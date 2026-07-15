import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  CancelPayoutGQL,
  CancelPayoutSessionGQL,
  PayoutSessionViewGQL,
  PayoutSessionViewQuery,
  ProcessPayoutGQL,
  ProcessPayoutSessionGQL,
} from '@kasi/admin-panel/generated/graphql';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payout-session-view',
  templateUrl: './payout-session-view.component.html',
})
export class PayoutSessionViewComponent implements OnInit {
  session?: PayoutSessionViewQuery['payoutSession'];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private viewGQL: PayoutSessionViewGQL,
    private processPayoutGQL: ProcessPayoutGQL,
    private cancelPayoutGQL: CancelPayoutGQL,
    private processSessionGQL: ProcessPayoutSessionGQL,
    private cancelSessionGQL: CancelPayoutSessionGQL,
    private msg: NzMessageService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.payoutSession != null) {
        this.session = data.payoutSession.data.payoutSession;
      }
    });
  }

  get pendingCount(): number {
    return (
      this.session?.payouts.nodes.filter((p) => p.status === 'Pending')
        .length ?? 0
    );
  }

  private async refresh() {
    if (this.session == null) return;
    const result = await firstValueFrom(
      this.viewGQL.fetch(
        { id: this.session.id },
        { fetchPolicy: 'network-only' }
      )
    );
    this.session = result.data.payoutSession;
  }

  private async run(action: Promise<unknown>) {
    this.loading = true;
    try {
      await action;
      await this.refresh();
    } catch (error: any) {
      this.msg.error(error.message);
      await this.refresh();
    } finally {
      this.loading = false;
    }
  }

  processPayout(id: string) {
    return this.run(firstValueFrom(this.processPayoutGQL.mutate({ id })));
  }

  cancelPayout(id: string) {
    return this.run(firstValueFrom(this.cancelPayoutGQL.mutate({ id })));
  }

  processSession() {
    if (this.session == null) return;
    return this.run(
      firstValueFrom(this.processSessionGQL.mutate({ id: this.session.id }))
    );
  }

  cancelSession() {
    if (this.session == null) return;
    return this.run(
      firstValueFrom(this.cancelSessionGQL.mutate({ id: this.session.id }))
    );
  }

  statusColor(status: string): string {
    switch (status) {
      case 'Paid':
      case 'Processed':
        return 'success';
      case 'Canceled':
        return 'default';
      default:
        return 'processing';
    }
  }
}
