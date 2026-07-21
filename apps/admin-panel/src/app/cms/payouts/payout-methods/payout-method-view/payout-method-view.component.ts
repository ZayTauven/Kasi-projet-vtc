import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CreatePayoutMethodGQL,
  PayoutMethodViewQuery,
  UpdatePayoutMethodGQL,
} from "@kasi/admin-panel/generated/graphql";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-payout-method-view",
  templateUrl: "./payout-method-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PayoutMethodViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    type: [null, Validators.required],
    name: [null, Validators.required],
    currency: [null, [Validators.required, Validators.maxLength(3)]],
    enabled: [true, Validators.required],
    minimumAmount: [0],
    instructions: [null],
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreatePayoutMethodGQL,
    private updateGQL: UpdatePayoutMethodGQL,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.payoutMethod != null) {
        const val: PayoutMethodViewQuery = data.payoutMethod.data;
        if (val.payoutMethod != null) {
          this.form.patchValue(val.payoutMethod);
        }
      }
    });
  }

  cancel() {
    this.router.navigate(["payouts/methods"], { relativeTo: this.route.root });
  }

  async onSubmit() {
    try {
      const { id, ...update } = this.form.value;
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ variables: { input: update } }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ variables: { id, update } }));
      }
      this.router.navigate(["payouts/methods"], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }
}
