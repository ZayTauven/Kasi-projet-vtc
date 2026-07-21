import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import {
  CurrentConfigurationQuery,
  UpdateConfigStatus,
  UpdateFirebaseGQL,
  UpdateMapsApiKeyGQL,
} from "@kasi/admin-panel/generated/graphql";
import { environment } from "@kasi/admin-panel/src/environments/environment";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzUploadChangeParam } from "ng-zorro-antd/upload";
import { TranslateService } from "@ngx-translate/core";
import { firstValueFrom, map, Observable, Subscription } from "rxjs";

@Component({
  selector: "app-config",
  templateUrl: "./config.component.html",
  styleUrls: ["./config.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ConfigComponent implements OnInit, OnDestroy {
  currentStep = 0;
  remoteConfig!: Observable<ApolloClient.QueryResult<CurrentConfigurationQuery>>;
  currentConfig!: CurrentConfigurationQuery;
  email?: string;
  root = environment.root;
  configed = false;

  configSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private updateMapsGql: UpdateMapsApiKeyGQL,
    private updateFirebaseGql: UpdateFirebaseGQL,
    private msg: NzMessageService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.remoteConfig = this.route.data.pipe(map((data) => data.config));
    this.configSubscription = this.remoteConfig.subscribe(
      (data) => (this.currentConfig = data.data!),
    );
  }

  ngOnDestroy(): void {
    this.configSubscription?.unsubscribe();
  }

  pre(): void {
    this.currentStep -= 1;
  }

  async next() {
    switch (this.currentStep) {
      case 0: {
        if (
          this.currentConfig.currentConfiguration.adminPanelAPIKey == null ||
          this.currentConfig.currentConfiguration.adminPanelAPIKey.length <
            10 ||
          this.currentConfig.currentConfiguration.backendMapsAPIKey == null ||
          this.currentConfig.currentConfiguration.backendMapsAPIKey.length < 10
        ) {
          this.msg.error(this.translate.instant("config.invalidMapsKeys"));
          return;
        }
        const result = await firstValueFrom(
          this.updateMapsGql.mutate({ variables: {
            backend: this.currentConfig.currentConfiguration.backendMapsAPIKey,
            adminPanel:
              this.currentConfig.currentConfiguration.adminPanelAPIKey,
          } }),
        );
        if (result.data?.updateMapsAPIKey.status == UpdateConfigStatus.Ok) {
          this.currentStep += 1;
        } else {
          this.msg.error(
            result.data?.updateMapsAPIKey.message ?? "Unknown Error",
          );
        }
        break;
      }
    }
  }

  async done() {
    if (
      this.currentConfig.currentConfiguration.firebaseProjectPrivateKey == null
    ) {
      this.msg.error(this.translate.instant("config.invalidFirebaseKey"));
      return;
    }
    const result = await firstValueFrom(
      this.updateFirebaseGql.mutate({ variables: {
        keyFileName:
          this.currentConfig.currentConfiguration.firebaseProjectPrivateKey,
      } }),
    );
    if (result.data?.updateFirebase.status == UpdateConfigStatus.Ok) {
      this.configed = true;
    } else {
      this.msg.error(result.data?.updateFirebase.message ?? "Unknown error");
    }
  }

  handleChange(event: NzUploadChangeParam): void {
    const status = event.file.status;
    if (status !== "uploading") {
    }
    if (status === "done") {
      this.msg.success(
        this.translate.instant("config.uploadSuccess", {
          file: event.file.name,
        }),
      );
      this.currentConfig.currentConfiguration.firebaseProjectPrivateKey =
        event.file.name;
    } else if (status === "error") {
      this.msg.error(
        this.translate.instant("config.uploadFailed", {
          file: event.file.name,
        }),
      );
    }
  }
}
