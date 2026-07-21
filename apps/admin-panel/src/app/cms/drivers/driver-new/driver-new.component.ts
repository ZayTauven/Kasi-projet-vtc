import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import {
  UntypedFormGroup,
  Validators,
  UntypedFormBuilder,
  FormGroup,
  FormBuilder,
} from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { CreateDriverGQL } from "@kasi/admin-panel/generated/graphql";
import { firstValueFrom } from "rxjs";
import { RouterHelperService } from "../../../@services/router-helper.service";
import { COUNTRY_CODE_LIST } from "../../../country-codes";
import { phoneNumberFormatValidator } from "../../../@services/phone-number.validator";

@Component({
  selector: "app-driver-new",
  templateUrl: "./driver-new.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverNewComponent {
  form: FormGroup = this.fb.group({
    firstName: null,
    lastName: null,
    phoneNumber: this.fb.group({
      prefix: "+221",
      number: [null, phoneNumberFormatValidator("prefix")],
    }),
    gender: null,
  });

  countryCodes = COUNTRY_CODE_LIST;

  constructor(
    private fb: FormBuilder,
    private createGQL: CreateDriverGQL,
    private routerHelper: RouterHelperService,
    private route: ActivatedRoute,
  ) {
    (this.form.get("phoneNumber") as FormGroup)
      .get("prefix")
      ?.valueChanges.subscribe(() => {
        (this.form.get("phoneNumber") as FormGroup)
          .get("number")
          ?.updateValueAndValidity();
      });
  }

  async submitForm() {
    const { phoneNumber, ..._formValue } = this.form.value;
    await firstValueFrom(
      this.createGQL.mutate({
        input: {
          mobileNumber: `${phoneNumber.prefix}${phoneNumber.number}`,
          ..._formValue,
        },
      }),
    );
    this.routerHelper.goToParent(this.route);
  }

  cancel() {
    this.routerHelper.goToParent(this.route);
  }
}
