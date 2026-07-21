import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  CreateShiftRuleGQL,
  DeleteShiftRuleGQL,
  ShiftRuleViewQuery,
  UpdateShiftRuleGQL,
} from "@kasi/admin-panel/generated/graphql";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-shift-rule-view",
  templateUrl: "./shift-rule-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ShiftRuleViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    name: [null, Validators.required],
    enabled: [true, Validators.required],
    frequency: ["Daily", Validators.required],
    maxHoursPerPeriod: [null],
    mandatoryBreakMinutes: [null],
    enforced: [false],
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateShiftRuleGQL,
    private updateGQL: UpdateShiftRuleGQL,
    private deleteGQL: DeleteShiftRuleGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  get isEdit(): boolean {
    return this.form.value.id != null;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.shiftRule != null) {
        const val: ShiftRuleViewQuery = data.shiftRule.data;
        if (val.shiftRule != null) {
          this.form.patchValue(val.shiftRule);
        }
      }
    });
  }

  async onSubmit() {
    try {
      const { id, ...update } = this.form.value;
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ variables: { input: update } }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ variables: { id, update } }));
      }
      this.router.navigate(["management/shift-rules"], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  cancel() {
    this.router.navigate(["management/shift-rules"], {
      relativeTo: this.route.root,
    });
  }

  async onDelete() {
    const id = this.form.value.id;
    if (id == null) {
      return;
    }
    try {
      await firstValueFrom(this.deleteGQL.mutate({ variables: { id } }));
      this.msg.success(this.translate.instant("shiftRules.deleted"));
      this.router.navigate(["management/shift-rules"], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }
}
