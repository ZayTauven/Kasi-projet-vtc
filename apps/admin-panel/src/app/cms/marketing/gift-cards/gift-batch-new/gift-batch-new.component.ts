import { Component } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CreateGiftBatchGQL } from '@kasi/admin-panel/generated/graphql';
import { RouterHelperService } from '@kasi/admin-panel/src/app/@services/router-helper.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-gift-batch-new',
  templateUrl: './gift-batch-new.component.html',
  styles: ['nz-input-number{ @apply w-full } nz-date-picker{ @apply w-full }'],
})
export class GiftBatchNewComponent {
  form = this.fb.group({
    name: [null, Validators.required],
    currency: ['XOF', Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    quantity: [null, [Validators.required, Validators.min(1)]],
    availableTimestamp: [null],
    expirationTimestamp: [null],
  });

  constructor(
    private route: ActivatedRoute,
    private message: NzMessageService,
    private fb: UntypedFormBuilder,
    private routerHelper: RouterHelperService,
    private createGQL: CreateGiftBatchGQL
  ) {}

  async onSubmit() {
    const { availableTimestamp, expirationTimestamp, ...rest } = this.form.value;
    const input: any = { ...rest };
    if (availableTimestamp != null) input.availableTimestamp = availableTimestamp;
    if (expirationTimestamp != null) input.expirationTimestamp = expirationTimestamp;
    try {
      await firstValueFrom(this.createGQL.mutate({ input }));
      this.routerHelper.goToParent(this.route);
    } catch (error: any) {
      this.message.error(error.message);
    }
  }
}
