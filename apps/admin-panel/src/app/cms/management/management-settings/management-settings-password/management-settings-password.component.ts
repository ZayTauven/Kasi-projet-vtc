import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { UpdatePasswordGQL } from "@kasi/admin-panel/generated/graphql";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-management-settings-password",
  templateUrl: "./management-settings-password.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ManagementSettingsPasswordComponent implements OnInit {
  form = this.fb.group({
    oldPassword: [null, Validators.required],
    newPassword: [null, Validators.required],
    newPasswordRepeat: [null, Validators.required],
  });
  constructor(
    private message: NzMessageService,
    private updatePasswordGql: UpdatePasswordGQL,
    private fb: UntypedFormBuilder,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {}

  cancel() {
    this.form.reset();
  }

  async onSubmit() {
    if (this.form.value.newPassword != this.form.value.newPasswordRepeat) {
      this.message.error(this.translate.instant("msg.passwordsDontMatch"));
      return;
    }
    try {
      await firstValueFrom(
        this.updatePasswordGql.mutate({ variables: {
          input: {
            oldPassword: this.form.value.oldPassword,
            newPasswod: this.form.value.newPassword,
          },
        } }),
      );
      this.message.success(this.translate.instant("msg.passwordUpdated"));
      this.form.reset();
    } catch (error) {
      this.message.error(this.translate.instant("msg.actionNotAllowed"));
    }
  }
}
