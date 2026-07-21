import {
  Component,
  HostBinding,
  Inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy
} from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { LoginGQL } from "@kasi/admin-panel/generated/graphql";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

import { loginTransition } from "./login.animation";
import { ThemeService } from "../@services/theme.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
  animations: [loginTransition],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class LoginComponent implements OnInit, OnDestroy {
  @HostBinding("@loginTransition") state = "activated";
  validateForm = this.fb.group({
    userName: [null, [Validators.required]],
    password: [null, []],
    remember: [true],
  });
  validating = false;
  passwordVisible = false;

  /** Horloge live du hero (fuseau Dakar). */
  clock = "";
  private clockTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick();
    this.clockTimer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private tick(): void {
    this.clock = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Dakar",
    }).format(new Date());
  }

  submitForm(): void {
    for (const i in this.validateForm.controls) {
      this.validateForm.controls[i].markAsDirty();
      this.validateForm.controls[i].updateValueAndValidity();
    }
  }

  constructor(
    private fb: UntypedFormBuilder,
    private router: Router,
    @Inject(NzMessageService) private message: NzMessageService,
    private loginGql: LoginGQL,
    public themeService: ThemeService,
  ) {}

  async onLogin() {
    try {
      const username = this.validateForm.get("userName")?.value;
      const password = this.validateForm.get("password")?.value;
      const res = await firstValueFrom(
        this.loginGql.fetch({ username, password }),
      );
      localStorage.setItem("kasi_admin_token", res.data.login.token);
      this.router.navigate([""], {});
    } catch (exception: any) {
      this.message.error(exception.message);
      this.validateForm.controls["password"].setErrors({ incorrect: true });
    }
  }
}
