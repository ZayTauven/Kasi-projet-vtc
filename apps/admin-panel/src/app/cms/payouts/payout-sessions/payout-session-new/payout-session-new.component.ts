import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CreatePayoutSessionGQL,
  PayoutMethodListGQL,
  PayoutMethodListQuery,
  PayoutSessionPreviewGQL,
  PayoutSessionPreviewQuery,
} from "@kasi/admin-panel/generated/graphql";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, map, Observable } from "rxjs";

@Component({
  selector: "app-payout-session-new",
  templateUrl: "./payout-session-new.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PayoutSessionNewComponent implements OnInit {
  form = this.fb.group({
    currency: ["XOF", [Validators.required, Validators.maxLength(3)]],
    minimumAmount: [0],
    description: [null],
    methodIds: [[]],
  });
  methods?: Observable<PayoutMethodListQuery["payoutMethods"]["nodes"]>;
  preview?: PayoutSessionPreviewQuery["payoutSessionPreview"];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private methodsGQL: PayoutMethodListGQL,
    private previewGQL: PayoutSessionPreviewGQL,
    private createGQL: CreatePayoutSessionGQL,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.methods = this.methodsGQL
      .fetch({ variables: { paging: { limit: 100 } } })
      .pipe(map((result) => result.data!.payoutMethods.nodes));
    // L'aperçu devient obsolète dès que les critères changent.
    this.form.valueChanges.subscribe(() => (this.preview = undefined));
  }

  private input() {
    const { methodIds, ...rest } = this.form.value;
    return {
      ...rest,
      methodIds: methodIds?.length > 0 ? methodIds : undefined,
    };
  }

  cancel() {
    this.router.navigate(["payouts/sessions"], { relativeTo: this.route.root });
  }

  async onPreview() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      const result = await firstValueFrom(
        this.previewGQL.fetch({ variables: { input: this.input() } }),
      );
      this.preview = result.data!.payoutSessionPreview;
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      const result = await firstValueFrom(
        this.createGQL.mutate({ variables: { input: this.input() } }),
      );
      this.router.navigate(
        ["payouts/sessions/view/" + result.data?.createPayoutSession?.id],
        { relativeTo: this.route.root },
      );
    } catch (error: any) {
      this.msg.error(
        error.message === "NO_ELIGIBLE_DRIVER"
          ? "payouts.noEligible"
          : error.message,
      );
    } finally {
      this.loading = false;
    }
  }
}
