import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
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
  ) {}

  ngOnInit(): void {}

  cancel() {
    this.form.reset();
  }

  async onSubmit() {
    if (this.form.value.newPassword != this.form.value.newPasswordRepeat) {
      this.message.error("Passwords don't match.");
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
      this.message.success("Password Updated Successfully.");
      this.form.reset();
    } catch (error) {
      this.message.error("Action is not allowed.");
    }
  }
}
