import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import {
  CreateDriverDocumentTypeGQL,
  DriverDocumentTypesGQL,
  DriverDocumentTypesQuery,
  UpdateDriverDocumentTypeGQL,
  VehicleType,
} from "@kasi/admin-panel/generated/graphql";
import { financialErrorMessage } from "@kasi/admin-panel/src/app/@services/debt-status";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom } from "rxjs";

type DocumentType = DriverDocumentTypesQuery["driverDocumentTypes"][number];

/**
 * p2-kyc K2 (2026-10-20, fiche KYC §3.1) : catalogue des documents du
 * Kasiman. Pas de suppression (des documents s'y rattachent) : un type se
 * desactive. Le code ne change plus apres creation (lu par les apps).
 * p2-kyc K4 (2026-10-20) : portee par type de vehicule (vide = tous).
 */
@Component({
  selector: "app-document-types",
  templateUrl: "./document-types.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DocumentTypesComponent implements OnInit {
  types: DocumentType[] = [];
  loading = false;
  saving = false;
  /** `null` : rien d'ouvert ; `"new"` : creation ; sinon l'id edite. */
  editing: string | null = null;
  vehicleTypes = Object.values(VehicleType);
  form = this.fb.group({
    code: [null, [Validators.required, Validators.pattern(/^[a-z0-9_]{2,32}$/)]],
    title: [null, [Validators.required, Validators.maxLength(120)]],
    description: [null],
    isEnabled: [true],
    isRequired: [true],
    hasExpiryDate: [true],
    reminderDays: ["30, 14, 7, 3, 1", Validators.pattern(/^\s*(\d{1,3}\s*(,\s*\d{1,3}\s*)*)?$/)],
    sortOrder: [0],
    vehicleTypes: [[] as VehicleType[]],
  });

  constructor(
    private fb: UntypedFormBuilder,
    private listGQL: DriverDocumentTypesGQL,
    private createGQL: CreateDriverDocumentTypeGQL,
    private updateGQL: UpdateDriverDocumentTypeGQL,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const result = await firstValueFrom(this.listGQL.fetch());
      this.types = result.data?.driverDocumentTypes ?? [];
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.loading = false;
    }
  }

  create() {
    this.editing = "new";
    this.form.reset({
      code: null,
      title: null,
      description: null,
      isEnabled: true,
      isRequired: true,
      hasExpiryDate: true,
      reminderDays: "30, 14, 7, 3, 1",
      sortOrder: (this.types.at(-1)?.sortOrder ?? 0) + 10,
      vehicleTypes: [],
    });
    this.form.get("code")!.enable();
  }

  edit(type: DocumentType) {
    this.editing = type.id;
    this.form.reset({ ...type, reminderDays: type.reminderDays.join(", "), vehicleTypes: [...type.vehicleTypes] });
    this.form.get("code")!.disable();
  }

  async submitForm() {
    if (this.form.invalid || this.saving || this.editing == null) return;
    const value = this.form.getRawValue();
    const input = {
      title: value.title?.trim(),
      description: value.description?.trim() || null,
      isEnabled: !!value.isEnabled,
      isRequired: !!value.isRequired,
      hasExpiryDate: !!value.hasExpiryDate,
      reminderDays: String(value.reminderDays ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x !== "")
        .map(Number),
      sortOrder: Math.round(Number(value.sortOrder ?? 0)),
      vehicleTypes: (value.vehicleTypes ?? []) as VehicleType[],
    };
    this.saving = true;
    try {
      if (this.editing === "new") {
        await firstValueFrom(
          this.createGQL.mutate({ variables: { input: { ...input, code: value.code.trim().toLowerCase() } } }),
        );
      } else {
        await firstValueFrom(this.updateGQL.mutate({ variables: { id: this.editing, input } }));
      }
      this.msg.success(this.translate.instant("kyc.types.saved"));
      this.editing = null;
      await this.load();
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.saving = false;
    }
  }
}
