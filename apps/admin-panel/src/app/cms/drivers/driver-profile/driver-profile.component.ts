import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import {
  DeleteDriverGQL,
  DriverStatus,
  UpdateDriverStatusGQL,
  ViewDriverQuery,
} from "@kasi/admin-panel/generated/graphql";
import {
  debtStatusOf,
  debtTagColor,
  DebtStatus,
  financialErrorMessage,
} from "@kasi/admin-panel/src/app/@services/debt-status";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { environment } from "@kasi/admin-panel/src/environments/environment";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, map, Observable } from "rxjs";
import { camelCase } from "camel-case";
import { RouterHelperService } from "../../../@services/router-helper.service";
import { NzModalService } from "ng-zorro-antd/modal";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-driver-profile",
  templateUrl: "./driver-profile.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverProfileComponent implements OnInit {
  public driverStatus = DriverStatus;
  query?: Observable<ApolloClient.QueryResult<ViewDriverQuery>>;
  root = environment.root;
  toCamelCase = camelCase;
  debtTagColor = debtTagColor;

  constructor(
    private route: ActivatedRoute,
    public tagColor: TagColorService,
    private message: NzMessageService,
    private modal: NzModalService,
    private deleteGQL: DeleteDriverGQL,
    private updateGQL: UpdateDriverStatusGQL,
    private routerHelper: RouterHelperService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.driver));
  }

  /** p2-argent I3 : dette et statut (normal, alerte, bloque) du Kasiman. */
  debtOf(
    wallets: { balance: number; currency: string }[] | null | undefined,
    policies: ViewDriverQuery["moneyPolicies"] | undefined,
  ): DebtStatus | null {
    return debtStatusOf(wallets, policies);
  }

  async changeStatus(status: DriverStatus) {
    const id = this.route.snapshot.params.id ?? 0;
    try {
      await firstValueFrom(this.updateGQL.mutate({ variables: { id, status } }));
    } catch (error: any) {
      // p2-kyc K4 : approbation refusee (type de vehicule ou documents manquants).
      this.message.error(financialErrorMessage(error, this.translate));
      return;
    }
    this.routerHelper.refresh(this.route);
  }

  /** p2-kyc K4 : un nouveau Kasiman, pas encore approuve. */
  awaitingApproval(status: DriverStatus): boolean {
    return status === DriverStatus.PendingApproval || status === DriverStatus.WaitingDocuments;
  }

  deleteDriver(id: string) {
    this.modal.confirm({
      nzTitle: this.translate.instant("message.deleteDriverConfirmation.title"),
      nzContent: this.translate.instant(
        "message.deleteDriverConfirmation.content",
      ),
      nzOnOk: async () => {
        try {
          await firstValueFrom(this.deleteGQL.mutate({ variables: { id } }));
          this.message.success(
            this.translate.instant("message.deleteDriverCofirmAlert"),
          );
          this.router.navigateByUrl("/drivers");
        } catch (error: any) {
          if (error.message == "PERMISSION_NOT_GRANTED") {
            this.message.error(
              this.translate.instant("error.PERMISSION_NOT_GRANTED"),
            );
          } else {
            this.message.error(error.message);
          }
        }
      },
    });
  }
}
