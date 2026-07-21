import { Component, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { CreateFleetGQL } from "@kasi/admin-panel/generated/graphql";
import { COUNTRY_CODE_LIST } from "@kasi/admin-panel/src/app/country-codes";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";
import { phoneNumberFormatValidator } from "../../../../@services/phone-number.validator";

@Component({
  selector: "app-fleet-new",
  templateUrl: "./fleet-new.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FleetNewComponent {
  form = this.fb.group({
    name: [null, Validators.required],
    phoneNumberPrefix: ["+221", Validators.required],
    phoneNumber: [
      null,
      [Validators.required, phoneNumberFormatValidator("phoneNumberPrefix")],
    ],
    mobileNumberPrefix: ["+221", Validators.required],
    mobileNumber: [
      null,
      [Validators.required, phoneNumberFormatValidator("mobileNumberPrefix")],
    ],
    accountNumber: [null, Validators.required],
    commissionSharePercent: [0, Validators.required],
    commissionShareFlat: [0, Validators.required],
    address: [null],
  });
  countryCodes = COUNTRY_CODE_LIST;

  constructor(
    private fb: UntypedFormBuilder,
    private createRiderGQL: CreateFleetGQL,
    private messageService: NzMessageService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form.get("phoneNumberPrefix")?.valueChanges.subscribe(() => {
      this.form.get("phoneNumber")?.updateValueAndValidity();
    });
    this.form.get("mobileNumberPrefix")?.valueChanges.subscribe(() => {
      this.form.get("mobileNumber")?.updateValueAndValidity();
    });
  }

  cancel() {
    this.router.navigateByUrl("/management/fleets");
  }

  async submitForm() {
    const {
      phoneNumber,
      phoneNumberPrefix,
      mobileNumber,
      mobileNumberPrefix,
      ..._formValue
    } = this.form.value;
    const result = await firstValueFrom(
      this.createRiderGQL.mutate({ variables: {
        input: {
          phoneNumber: `${phoneNumberPrefix.substring(1)}${phoneNumber}`,
          mobileNumber: `${mobileNumberPrefix.substring(1)}${mobileNumber}`,
          ..._formValue,
        },
      } }),
    );
    if (result.error != null) {
      this.messageService.error(result.error.message);
    } else {
      this.messageService.success("Success");
    }
    this.router.navigateByUrl("/management/fleets");
  }
}
