import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  AnnouncementUserType,
  CancelOrderGQL,
  DispatcherCancelReasonsGQL,
  OrderUpdatedGQL,
  OrderUpdatedSubscription,
} from "@kasi/admin-panel/generated/graphql";
import { ApolloClient } from "@apollo/client/core";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, Observable } from "rxjs";

@Component({
  selector: "app-dispatcher-looking",
  templateUrl: "./dispatcher-looking.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DispatcherLookingComponent implements OnInit {
  query?: Observable<ApolloClient.SubscribeResult<OrderUpdatedSubscription>>;
  orderId!: string;

  // p3-mesures M4 (A3) : motif operateur obligatoire a l'annulation.
  // Repli (fiche §2) : si le catalogue ne se charge pas ou est vide,
  // l'annulation part sans motif plutot que d'etre bloquee.
  cancelOpen = false;
  cancelReasons: { id: string; title: string }[] = [];
  cancelReasonsState: "loading" | "ready" | "unavailable" = "loading";
  cancelReasonId: string | null = null;
  canceling = false;

  constructor(
    private orderUpdateSubscription: OrderUpdatedGQL,
    private cancelOrderMutation: CancelOrderGQL,
    private cancelReasonsQuery: DispatcherCancelReasonsGQL,
    private route: ActivatedRoute,
    private router: Router,
    private msg: NzMessageService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParams.requestId;
    this.query = this.orderUpdateSubscription.subscribe({ variables: { id: this.orderId } });
  }

  async openCancel() {
    this.cancelOpen = true;
    this.cancelReasonId = null;
    this.cancelReasonsState = "loading";
    try {
      const result = await firstValueFrom(
        this.cancelReasonsQuery.fetch({ fetchPolicy: "network-only" }),
      );
      this.cancelReasons = (result.data?.orderCancelReasons.nodes ?? [])
        .filter((r) => r.isEnabled && r.userType === AnnouncementUserType.Operator)
        .map(({ id, title }) => ({ id, title }));
    } catch {
      this.cancelReasons = [];
    }
    this.cancelReasonsState = this.cancelReasons.length > 0 ? "ready" : "unavailable";
  }

  get canConfirmCancel(): boolean {
    if (this.canceling || this.cancelReasonsState === "loading") return false;
    return this.cancelReasonsState === "unavailable" || this.cancelReasonId != null;
  }

  async cancelRequest() {
    if (!this.canConfirmCancel) return;
    const orderId = this.route.snapshot.queryParams.requestId;
    const cancelReasonId =
      this.cancelReasonsState === "ready" ? this.cancelReasonId : null;
    this.canceling = true;
    try {
      await firstValueFrom(
        this.cancelOrderMutation.mutate({ variables: { orderId, cancelReasonId } }),
      );
    } finally {
      this.canceling = false;
    }
    this.cancelOpen = false;
    this.msg.success(this.translate.instant("msg.orderCanceled"));
    this.router.navigate(["../riders-list"], {
      relativeTo: this.route,
    });
  }
}
