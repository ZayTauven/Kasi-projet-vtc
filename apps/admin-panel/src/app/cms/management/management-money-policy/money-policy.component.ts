import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import {
  AbstractControl,
  UntypedFormBuilder,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import {
  MoneyPoliciesGQL,
  MoneyPoliciesQuery,
  UpdateMoneyPolicyGQL,
} from "@kasi/admin-panel/generated/graphql";
import { financialErrorMessage } from "@kasi/admin-panel/src/app/@services/debt-status";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

/** L'alerte doit rester strictement inferieure au plafond. */
function alertBelowLimit(group: AbstractControl): ValidationErrors | null {
  const limit = Number(group.get("debtLimit")?.value);
  const alert = Number(group.get("debtAlertThreshold")?.value);
  if (!limit || !alert) return null;
  return alert < limit ? null : { alertNotBelowLimit: true };
}

/**
 * p2-argent I3 (2026-10-19, fiche argent §4.1) : plafond de dette et seuil
 * d'alerte des Kasimen, par devise (`money_policy`). Relu a chaque controle
 * cote serveur : le changement vaut tout de suite, deblocage compris.
 */
@Component({
  selector: "app-money-policy",
  templateUrl: "./money-policy.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class MoneyPolicyComponent implements OnInit {
  form = this.fb.group(
    {
      currency: [null, Validators.required],
      debtLimit: [null, [Validators.required, Validators.min(1)]],
      debtAlertThreshold: [null, [Validators.required, Validators.min(1)]],
    },
    { validators: alertBelowLimit },
  );
  policies: MoneyPoliciesQuery["moneyPolicies"] = [];
  currencies: string[] = [];
  loading = false;
  saving = false;

  constructor(
    private fb: UntypedFormBuilder,
    private policiesGQL: MoneyPoliciesGQL,
    private updateGQL: UpdateMoneyPolicyGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.form.get("currency")!.valueChanges.subscribe((currency) => this.select(currency));
    this.load();
  }

  async load(currency?: string) {
    this.loading = true;
    try {
      const result = await firstValueFrom(this.policiesGQL.fetch());
      this.policies = result.data?.moneyPolicies ?? [];
      this.currencies = [
        ...new Set([
          ...this.policies.map((p) => p.currency),
          ...(result.data?.regions.nodes ?? []).map((r) => r.currency),
        ]),
      ];
      this.select(currency ?? this.form.value.currency ?? this.currencies[0]);
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.loading = false;
    }
  }

  /** Remplit le formulaire avec la politique de la devise choisie. */
  select(currency: string | null | undefined) {
    const policy = this.policyOf(currency);
    this.form.reset(
      {
        currency: currency ?? null,
        debtLimit: policy?.debtLimit ?? null,
        debtAlertThreshold: policy?.debtAlertThreshold ?? null,
      },
      { emitEvent: false },
    );
  }

  policyOf(currency: string | null | undefined) {
    return this.policies.find((p) => p.currency === currency);
  }

  async submitForm() {
    if (this.form.invalid || this.saving) {
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    try {
      await firstValueFrom(
        this.updateGQL.mutate({
          variables: {
            input: {
              currency: value.currency,
              debtLimit: Math.round(Number(value.debtLimit)),
              debtAlertThreshold: Math.round(Number(value.debtAlertThreshold)),
            },
          },
        }),
      );
      this.msg.success(this.translate.instant("moneyPolicy.saved"));
      await this.load(value.currency);
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.saving = false;
    }
  }

  cancel() {
    this.select(this.form.value.currency);
  }
}
