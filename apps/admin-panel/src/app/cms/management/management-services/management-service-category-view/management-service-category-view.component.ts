import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  CreateServiceCategoryGQL,
  DeleteServiceCategoryGQL,
  UpdateServiceCategoryGQL,
} from "@kasi/admin-panel/generated/graphql";
import { RouterHelperService } from "@kasi/admin-panel/src/app/@services/router-helper.service";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, Subscription } from "rxjs";

@Component({
  selector: "app-management-service-category-view",
  templateUrl: "./management-service-category-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ManagementServiceCategoryViewComponent
  implements OnInit, OnDestroy
{
  form = this.fb.group({
    id: [null],
    name: [null, Validators.required],
  });
  subscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private updateGQL: UpdateServiceCategoryGQL,
    private createGQL: CreateServiceCategoryGQL,
    private deleteGQL: DeleteServiceCategoryGQL,
    private fb: UntypedFormBuilder,
    private routerHelper: RouterHelperService,
    private msg: NzMessageService,
  ) {}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    this.subscription = this.route.data.subscribe((data) =>
      data.serviceCategory != null
        ? this.form.patchValue(data.serviceCategory.data.serviceCategory)
        : null,
    );
  }

  async onSubmit() {
    const { id, ...input } = this.form.value;
    if (id == null) {
      await firstValueFrom(this.createGQL.mutate({ variables: { input } }));
    } else {
      await firstValueFrom(this.updateGQL.mutate({ variables: { id, input } }));
    }
    this.routerHelper.goToParent(this.route);
  }

  cancel() {
    this.routerHelper.goToParent(this.route);
  }

  async deleteCategory() {
    const id = this.form.value.id;
    try {
      const res = await firstValueFrom(this.deleteGQL.mutate({ variables: { id } }));
      this.routerHelper.goToParent(this.route);
      this.msg.success("Deleted!");
    } catch (exception: any) {
      this.msg.error(exception.message);
    }
  }
}
