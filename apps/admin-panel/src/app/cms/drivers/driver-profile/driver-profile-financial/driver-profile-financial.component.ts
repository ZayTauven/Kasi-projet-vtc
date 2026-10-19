import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import {
  CreateDriverTransactionGQL,
  DriverDeductTransactionType,
  DriverFinancialsQuery,
  DriverRechargeTransactionType,
  RiderRechargeTransactionType,
  SettleDriverDebtGQL,
} from "@kasi/admin-panel/generated/graphql";
import {
  debtStatusOf,
  debtTagColor,
  DebtStatus,
  financialErrorMessage,
  newIdempotencyKey,
} from "@kasi/admin-panel/src/app/@services/debt-status";
import { RouterHelperService } from "@kasi/admin-panel/src/app/@services/router-helper.service";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, map, Observable, shareReplay, Subscription } from "rxjs";

@Component({
  selector: "app-driver-profile-financial",
  templateUrl: "./driver-profile-financial.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverProfileFinancialComponent implements OnInit, OnDestroy {
  formTransaction = this.fb.group({
    action: [null, Validators.required],
    rechargeType: [null],
    deductType: [null],
    amount: [0, Validators.required],
    currency: [null, Validators.required],
    description: [null],
    refrenceNumber: [null],
  });
  query?: Observable<ApolloClient.QueryResult<DriverFinancialsQuery>>;
  debtTagColor = debtTagColor;

  /**
   * p2-argent I3 (fiche argent §4.4) : reglement de la dette en especes.
   * `settleKey` est tiree a l'ouverture du formulaire et gardee jusqu'au
   * succes : un double clic ou un nouvel essai apres une coupure ne credite
   * qu'une fois (cle `debt-settlement:<settleKey>` cote serveur).
   */
  debt: DebtStatus | null = null;
  settleKey: string | null = null;
  settling = false;
  formSettle = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    currency: [null as string | null, Validators.required],
    location: ["SIEGE", [Validators.maxLength(32), Validators.pattern(/^[A-Za-z0-9_-]*$/)]],
    receiptNumber: [null as string | null, [Validators.required, Validators.maxLength(64)]],
    motif: [null as string | null, [Validators.required, Validators.maxLength(150)]],
  });
  private subscriptions: Subscription[] = [];
  deductTypes = Object.values(DriverDeductTransactionType);
  rechargeTypes = Object.values(DriverRechargeTransactionType);

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
    public tagColor: TagColorService,
    private fb: UntypedFormBuilder,
    private createTransactionGQL: CreateDriverTransactionGQL,
    private routerHelper: RouterHelperService,
    private msg: NzMessageService,
    private translate: TranslateService,
    private settleGQL: SettleDriverDebtGQL,
    private router: Router,
  ) {}
  ngOnInit(): void {
    this.query = this.route.data.pipe(
      map((data) => data.financials),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.subscriptions.push(
      this.query.subscribe((result) => {
        this.debt = debtStatusOf(
          result?.data?.driver?.wallet,
          result?.data?.moneyPolicies,
        );
        if (this.route.snapshot.queryParams["settle"] == "1" && this.settleKey == null) {
          this.openSettle();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /** Ouvre le formulaire de reglement : nouvelle cle d'unicite. */
  openSettle() {
    if (this.debt == null || this.debt.debt <= 0) {
      return;
    }
    this.settleKey = newIdempotencyKey();
    this.formSettle.reset({
      amount: this.debt.debt,
      currency: this.debt.currency,
      location: "SIEGE",
      receiptNumber: null,
      motif: null,
    });
  }

  closeSettle() {
    this.settleKey = null;
    this.formSettle.reset({ location: "SIEGE" });
    if (this.route.snapshot.queryParams["settle"] != null) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { settle: null },
        queryParamsHandling: "merge",
      });
    }
  }

  async onSubmitSettle() {
    if (this.settling || this.settleKey == null || this.formSettle.invalid) {
      return;
    }
    const value = this.formSettle.getRawValue();
    if (this.debt != null && (value.amount ?? 0) > this.debt.debt) {
      this.msg.error(this.translate.instant("debt.settle.amountTooHigh"));
      return;
    }
    this.settling = true;
    try {
      await firstValueFrom(
        this.settleGQL.mutate({
          variables: {
            input: {
              driverId: this.route.parent?.snapshot.params.id,
              amount: Math.round(Number(value.amount)),
              currency: value.currency!,
              location: (value.location ?? "").trim() || undefined,
              receiptNumber: value.receiptNumber!.trim(),
              motif: value.motif!.trim(),
              idempotencyKey: this.settleKey,
            },
          },
        }),
      );
      this.msg.success(this.translate.instant("debt.settle.done"));
      this.settleKey = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { settle: null, refresh: new Date().getTime() },
        queryParamsHandling: "merge",
      });
    } catch (error: any) {
      // La cle est gardee : un nouvel essai ne credite qu'une fois.
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.settling = false;
    }
  }

  async onSubmitTransaction() {
    if (
      this.formTransaction.value.action == "Recharge" &&
      this.formTransaction.value.rechargeType == null
    ) {
      this.msg.error(this.translate.instant("msg.selectTransactionType"));
      return;
    }
    if (
      this.formTransaction.value.action == "Deduct" &&
      this.formTransaction.value.deductType == null
    ) {
      this.msg.error(this.translate.instant("msg.selectTransactionType"));
      return;
    }
    this.formTransaction.value.driverId = this.route.parent?.snapshot.params.id;
    try {
      await firstValueFrom(
        this.createTransactionGQL.mutate({ variables: { input: this.formTransaction.value } }),
      );
      this.msg.success(this.translate.instant("msg.transactionSubmitted"));
      this.routerHelper.refresh(this.route);
      this.formTransaction.patchValue({});
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    }
  }

  cancel() {
    this.formTransaction.reset({ amount: 0 });
  }

  getUniquieCurrencies(currencies: { currency: string }[] | undefined) {
    if (currencies == undefined) return [];
    return [...new Set(currencies)];
  }
}
