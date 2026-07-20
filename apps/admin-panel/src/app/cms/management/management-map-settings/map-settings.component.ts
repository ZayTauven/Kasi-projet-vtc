import { Component, OnInit } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import {
  MapSettingGQL,
  UpdateMapSettingGQL,
} from "@kasi/admin-panel/generated/graphql";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-map-settings",
  templateUrl: "./map-settings.component.html",
  standalone: false,
})
export class MapSettingsComponent implements OnInit {
  form = this.fb.group({
    provider: ["Mapbox", Validators.required],
    mapboxToken: [null],
    mapboxStyleUser: ["mapbox", Validators.required],
    mapboxStyleId: ["streets-v12", Validators.required],
    googleMapsApiKey: [null],
  });

  loading = false;

  constructor(
    private fb: UntypedFormBuilder,
    private mapSettingGQL: MapSettingGQL,
    private updateMapSettingGQL: UpdateMapSettingGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const result = await firstValueFrom(this.mapSettingGQL.fetch());
      const setting = result.data.mapSetting;
      if (setting != null) {
        this.form.patchValue({
          provider: setting.provider,
          mapboxToken: setting.mapboxToken,
          mapboxStyleUser: setting.mapboxStyleUser,
          mapboxStyleId: setting.mapboxStyleId,
          googleMapsApiKey: setting.googleMapsApiKey,
        });
        this.form.markAsPristine();
      }
    } catch (error: any) {
      this.msg.error(error.message);
    } finally {
      this.loading = false;
    }
  }

  async submitForm() {
    if (this.form.invalid) {
      return;
    }
    try {
      await firstValueFrom(
        this.updateMapSettingGQL.mutate({ input: this.form.value }),
      );
      this.msg.success(this.translate.instant("mapSettings.saved"));
      this.form.markAsPristine();
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  cancel() {
    this.load();
  }
}
