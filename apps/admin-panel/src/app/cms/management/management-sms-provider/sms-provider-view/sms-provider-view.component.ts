import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CreateSmsProviderGQL,
  SendTestSmsGQL,
  SetDefaultSmsProviderGQL,
  SmsProviderViewQuery,
  UpdateSmsProviderGQL,
} from '@kasi/admin-panel/generated/graphql';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sms-provider-view',
  templateUrl: './sms-provider-view.component.html',
})
export class SmsProviderViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    type: [null, Validators.required],
    name: [null, Validators.required],
    enabled: [true, Validators.required],
    accountId: [null],
    apiSecret: [null],
    senderId: [null],
    verificationTemplate: [null, Validators.required],
  });
  isDefault = false;
  showTestSms = false;
  testNumber = '';
  sendingTest = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateSmsProviderGQL,
    private updateGQL: UpdateSmsProviderGQL,
    private setDefaultGQL: SetDefaultSmsProviderGQL,
    private sendTestSmsGQL: SendTestSmsGQL,
    private translate: TranslateService,
    private msg: NzMessageService
  ) {}

  get isEdit(): boolean {
    return this.form.value.id != null;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.smsProvider != null) {
        const val: SmsProviderViewQuery = data.smsProvider.data;
        if (val.smsProvider != null) {
          this.form.patchValue(val.smsProvider);
          this.isDefault = val.smsProvider.isDefault;
        }
      }
    });
  }

  async onSubmit() {
    try {
      const { id, apiSecret, ...update } = this.form.value;
      // apiSecret is write-only: only send it when the admin typed a new value.
      if (apiSecret != null && apiSecret !== '') {
        update.apiSecret = apiSecret;
      }
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ input: update }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ id, update }));
      }
      this.router.navigate(['management/sms-providers'], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  cancel() {
    this.router.navigate(['management/sms-providers'], {
      relativeTo: this.route.root,
    });
  }

  async onSetDefault() {
    const id = this.form.value.id;
    if (id == null) {
      return;
    }
    try {
      await firstValueFrom(this.setDefaultGQL.mutate({ id }));
      this.isDefault = true;
      this.msg.success(this.translate.instant('smsProvider.defaultSet'));
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onSendTestSms() {
    if (this.testNumber === '') {
      return;
    }
    this.sendingTest = true;
    try {
      await firstValueFrom(
        this.sendTestSmsGQL.mutate({
          number: this.testNumber,
          providerId: this.form.value.id,
        })
      );
      this.msg.success(this.translate.instant('smsProvider.testSent'));
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.sendingTest = false;
    }
  }
}
