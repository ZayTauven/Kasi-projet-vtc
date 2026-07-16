import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CreateCallMaskingProviderGQL,
  TestMaskedCallGQL,
  SetDefaultCallMaskingProviderGQL,
  CallMaskingProviderViewQuery,
  UpdateCallMaskingProviderGQL,
} from '@kasi/admin-panel/generated/graphql';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-call-masking-provider-view',
  templateUrl: './call-masking-provider-view.component.html',
})
export class CallMaskingProviderViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    type: [null, Validators.required],
    name: [null, Validators.required],
    enabled: [true, Validators.required],
    accountId: [null],
    apiSecret: [null],
    proxyNumber: [null],
    webhookAuthToken: [null],
    sessionTtlMinutes: [120],
  });
  isDefault = false;
  showTestCall = false;
  testNumber = '';
  sendingTest = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateCallMaskingProviderGQL,
    private updateGQL: UpdateCallMaskingProviderGQL,
    private setDefaultGQL: SetDefaultCallMaskingProviderGQL,
    private testMaskedCallGQL: TestMaskedCallGQL,
    private translate: TranslateService,
    private msg: NzMessageService
  ) {}

  get isEdit(): boolean {
    return this.form.value.id != null;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.callMaskingProvider != null) {
        const val: CallMaskingProviderViewQuery = data.callMaskingProvider.data;
        if (val.callMaskingProvider != null) {
          this.form.patchValue(val.callMaskingProvider);
          this.isDefault = val.callMaskingProvider.isDefault;
        }
      }
    });
  }

  async onSubmit() {
    try {
      const { id, apiSecret, webhookAuthToken, ...update } = this.form.value;
      // apiSecret and webhookAuthToken are write-only: only send them when the admin typed a new value.
      if (apiSecret != null && apiSecret !== '') {
        update.apiSecret = apiSecret;
      }
      if (webhookAuthToken != null && webhookAuthToken !== '') {
        update.webhookAuthToken = webhookAuthToken;
      }
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ input: update }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ id, update }));
      }
      this.router.navigate(['management/call-masking-providers'], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onSetDefault() {
    const id = this.form.value.id;
    if (id == null) {
      return;
    }
    try {
      await firstValueFrom(this.setDefaultGQL.mutate({ id }));
      this.isDefault = true;
      this.msg.success(
        this.translate.instant('callMaskingProvider.defaultSet')
      );
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onTestCall() {
    if (this.testNumber === '') {
      return;
    }
    this.sendingTest = true;
    try {
      await firstValueFrom(
        this.testMaskedCallGQL.mutate({
          number: this.testNumber,
          providerId: this.form.value.id,
        })
      );
      this.msg.success(this.translate.instant('callMaskingProvider.testSent'));
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.sendingTest = false;
    }
  }
}
