import { Component, OnInit } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CreateEmailProviderGQL,
  SendTestEmailGQL,
  SetDefaultEmailProviderGQL,
  EmailProviderViewQuery,
  UpdateEmailProviderGQL,
} from "@kasi/admin-panel/generated/graphql";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-email-provider-view",
  templateUrl: "./email-provider-view.component.html",
  standalone: false,
})
export class EmailProviderViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    type: ["Smtp", Validators.required],
    name: [null, Validators.required],
    enabled: [true, Validators.required],
    host: [null],
    port: [null],
    secure: [false],
    username: [null],
    password: [null],
    fromAddress: [null],
    fromName: [null],
  });
  isDefault = false;
  showTestEmail = false;
  testEmail = "";
  sendingTest = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateEmailProviderGQL,
    private updateGQL: UpdateEmailProviderGQL,
    private setDefaultGQL: SetDefaultEmailProviderGQL,
    private sendTestEmailGQL: SendTestEmailGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  get isEdit(): boolean {
    return this.form.value.id != null;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.emailProvider != null) {
        const val: EmailProviderViewQuery = data.emailProvider.data;
        if (val.emailProvider != null) {
          this.form.patchValue(val.emailProvider);
          this.isDefault = val.emailProvider.isDefault;
        }
      }
    });
  }

  async onSubmit() {
    try {
      const { id, password, ...rest } = this.form.value;
      const update: any = { ...rest };
      // password is write-only: only send it when the admin typed a new value,
      // otherwise the stored secret would be overwritten with an empty value.
      if (password != null && password !== "") {
        update.password = password;
      }
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ input: update }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ id, update }));
      }
      this.router.navigate(["management/email-providers"], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  cancel() {
    this.router.navigate(["management/email-providers"], {
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
      this.msg.success(this.translate.instant("emailProvider.defaultSet"));
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onSendTestEmail() {
    if (this.testEmail === "") {
      return;
    }
    this.sendingTest = true;
    try {
      await firstValueFrom(
        this.sendTestEmailGQL.mutate({
          to: this.testEmail,
          providerId: this.form.value.id,
        }),
      );
      this.msg.success(this.translate.instant("emailProvider.testSent"));
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.sendingTest = false;
    }
  }
}
