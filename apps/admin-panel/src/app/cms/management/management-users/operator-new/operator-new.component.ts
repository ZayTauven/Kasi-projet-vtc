import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import { CreateOperatorGQL, NewOperatorQuery } from '@kasi/admin-panel/generated/graphql';
import { COUNTRY_CODE_LIST } from '@kasi/admin-panel/src/app/country-codes';
import { firstValueFrom, map, Observable } from 'rxjs';

import { RouterHelperService } from '../../../../@services/router-helper.service';
import { phoneNumberFormatValidator } from '../../../../@services/phone-number.validator';

@Component({
  selector: 'app-operator-new',
  templateUrl: './operator-new.component.html',
  styles: [
  ]
})
export class OperatorNewComponent implements OnInit {
  query?: Observable<ApolloQueryResult<NewOperatorQuery>>;
  form: UntypedFormGroup = this.fb.group({
    firstName: [null],
    lastName: [null],
    roleId: [null, Validators.required],
    phoneNumberPrefix: ['+221', Validators.required],
    phoneNumber: [null, [Validators.required, phoneNumberFormatValidator('phoneNumberPrefix')]],
    userName: [null, Validators.required],
    password: [null, Validators.required]
  });
  countryCodes = COUNTRY_CODE_LIST;

  constructor(private fb: UntypedFormBuilder,
    private createGQL: CreateOperatorGQL,
    private routerHelper: RouterHelperService,
    private route: ActivatedRoute) {
    this.form.get('phoneNumberPrefix')?.valueChanges.subscribe(() => {
      this.form.get('phoneNumber')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.query = this.route.data.pipe(map(data => data.operator));
  }

  async submitForm() {
    const { phoneNumber, phoneNumberPrefix, ..._formValue } = this.form.value;
    await firstValueFrom(this.createGQL.mutate({ input: { mobileNumber: `${phoneNumberPrefix.substring(1)}${phoneNumber}`, ..._formValue } }));
    this.routerHelper.goToParent(this.route);
  }

}