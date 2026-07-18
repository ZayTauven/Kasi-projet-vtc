import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CreateRetentionPolicyGQL,
  DeleteRetentionPolicyGQL,
  RetentionPolicyViewQuery,
  RunRetentionPolicyDryRunGQL,
  UpdateRetentionPolicyGQL,
} from '@kasi/admin-panel/generated/graphql';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-retention-view',
  templateUrl: './retention-view.component.html',
})
export class RetentionViewComponent implements OnInit {
  form = this.fb.group({
    id: [null],
    name: [null, Validators.required],
    retentionDays: [30, [Validators.required, Validators.min(1)]],
    enabled: [true, Validators.required],
    // SÉCURITÉ : mode simulation coché par défaut (aucune suppression).
    dryRun: [true, Validators.required],
  });
  running = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateRetentionPolicyGQL,
    private updateGQL: UpdateRetentionPolicyGQL,
    private deleteGQL: DeleteRetentionPolicyGQL,
    private runDryRunGQL: RunRetentionPolicyDryRunGQL,
    private translate: TranslateService,
    private msg: NzMessageService
  ) {}

  get isEdit(): boolean {
    return this.form.value.id != null;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data.retentionPolicy != null) {
        const val: RetentionPolicyViewQuery = data.retentionPolicy.data;
        if (val.retentionPolicy != null) {
          this.form.patchValue(val.retentionPolicy);
        }
      }
    });
  }

  async onSubmit() {
    try {
      const { id, ...update } = this.form.value;
      if (id == null) {
        await firstValueFrom(this.createGQL.mutate({ input: update }));
      } else {
        await firstValueFrom(this.updateGQL.mutate({ id, update }));
      }
      this.router.navigate(['management/retention'], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  cancel() {
    this.router.navigate(['management/retention'], {
      relativeTo: this.route.root,
    });
  }

  async onDelete() {
    const id = this.form.value.id;
    if (id == null) {
      return;
    }
    try {
      await firstValueFrom(this.deleteGQL.mutate({ id }));
      this.router.navigate(['management/retention'], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onRunDryRun() {
    this.running = true;
    try {
      await firstValueFrom(this.runDryRunGQL.mutate({}));
      this.msg.success(this.translate.instant('retention.dryRunTriggered'));
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.running = false;
    }
  }
}
