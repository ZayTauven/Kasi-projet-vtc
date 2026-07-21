import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CancelOrderGQL,
  OrderUpdatedGQL,
  OrderUpdatedSubscription,
} from "@kasi/admin-panel/generated/graphql";
import { ApolloClient } from "@apollo/client/core";
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

  constructor(
    private orderUpdateSubscription: OrderUpdatedGQL,
    private cancelOrderMutation: CancelOrderGQL,
    private route: ActivatedRoute,
    private router: Router,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParams.requestId;
    this.query = this.orderUpdateSubscription.subscribe({ variables: { id: this.orderId } });
  }

  async cancelRequest() {
    const orderId = this.route.snapshot.queryParams.requestId;
    const result = await firstValueFrom(
      this.cancelOrderMutation.mutate({ variables: { orderId } }),
    );
    this.msg.success("Order Canceled.");
    this.router.navigate(["../riders-list"], {
      relativeTo: this.route,
    });
  }
}
