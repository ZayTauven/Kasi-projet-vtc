import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  CreateDriverDocumentGQL,
  DriverDocumentStatus,
  DriverKycDocumentsGQL,
  DriverKycDocumentsQuery,
  ReviewDriverDocumentGQL,
} from "@kasi/admin-panel/generated/graphql";
import { financialErrorMessage } from "@kasi/admin-panel/src/app/@services/debt-status";
import { RouterHelperService } from "@kasi/admin-panel/src/app/@services/router-helper.service";
import { environment } from "@kasi/admin-panel/src/environments/environment";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { firstValueFrom, Subscription } from "rxjs";

type KycDocument = DriverKycDocumentsQuery["driverDocuments"][number];
type KycType = DriverKycDocumentsQuery["driverDocumentTypes"][number];
type LegacyFile = { id: string; address: string };

/** `YYYY-MM-DD` du jour choisi (date locale du navigateur). */
export function toIsoDay(date: Date | null | undefined): string | null {
  if (date == null) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Jours restants avant l'echeance (valable jusqu'a ce jour inclus). */
export function daysUntil(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const today = Date.parse(`${toIsoDay(new Date())}T00:00:00Z`);
  return Math.round((Date.parse(`${expiresAt}T00:00:00Z`) - today) / 86400000);
}

export function kycStatusColor(status: DriverDocumentStatus | string): string {
  switch (status) {
    case DriverDocumentStatus.Approved:
      return "success";
    case DriverDocumentStatus.Pending:
      return "processing";
    case DriverDocumentStatus.Rejected:
    case DriverDocumentStatus.Expired:
      return "error";
    default:
      return "default";
  }
}

/**
 * p2-kyc K2 (2026-10-20, fiche KYC §3 et Q11) : documents types du Kasiman.
 * Par type du catalogue : fichier, numero, echeance, etat ; validation ou
 * refus motive des documents en attente ; typage des fichiers envoyes par
 * l'ancienne app (`driver.documents`), valides d'emblee.
 */
@Component({
  selector: "app-driver-profile-documents",
  templateUrl: "./driver-profile-documents.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DriverProfileDocumentsComponent implements OnInit, OnDestroy {
  root = environment.root;
  loading = true;
  busy = false;
  driverId = "";
  types: KycType[] = [];
  documents: KycDocument[] = [];
  legacyFiles: LegacyFile[] = [];
  suspended = false;
  previewUrl: string | null = null;
  rejecting: KycDocument | null = null;
  rejectNote = "";
  typing: LegacyFile | null = null;
  statusColor = kycStatusColor;
  pending = DriverDocumentStatus.Pending;
  daysUntil = daysUntil;
  form = this.fb.group({
    typeId: [null, Validators.required],
    number: [null],
    expiresAt: [null],
  });
  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder,
    private documentsGQL: DriverKycDocumentsGQL,
    private reviewGQL: ReviewDriverDocumentGQL,
    private createGQL: CreateDriverDocumentGQL,
    private routerHelper: RouterHelperService,
    private translate: TranslateService,
    private msg: NzMessageService,
  ) {}

  ngOnInit(): void {
    // Rechargement aussi apres `routerHelper.refresh` (statut du Kasiman).
    this.subscription = this.route.parent!.data.subscribe(() => {
      this.driverId = this.route.parent!.snapshot.params["id"];
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async load() {
    this.loading = true;
    try {
      const result = await firstValueFrom(
        this.documentsGQL.fetch({ variables: { driverId: this.driverId } }),
      );
      const data = result.data;
      this.types = data?.driverDocumentTypes ?? [];
      this.documents = data?.driverDocuments ?? [];
      this.suspended = (data?.documentSuspendedDriverIds ?? []).map(String).includes(String(this.driverId));
      const typed = new Set(this.documents.map((d) => d.mediaId).filter((x) => x != null));
      this.legacyFiles = (data?.driver?.documents ?? []).filter((m) => !typed.has(m.id));
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.loading = false;
    }
  }

  /** Types affiches : actifs, ou desactives mais porteurs de documents. */
  get shownTypes(): KycType[] {
    return this.types.filter((t) => t.isEnabled || this.documentsOf(t.id).length > 0);
  }

  get enabledTypes(): KycType[] {
    return this.types.filter((t) => t.isEnabled);
  }

  documentsOf(typeId: string): KycDocument[] {
    return this.documents.filter((d) => d.typeId === typeId);
  }

  isPdf(address: string | null | undefined): boolean {
    return (address ?? "").toLowerCase().endsWith(".pdf");
  }

  open(address: string | null | undefined) {
    if (!address) return;
    if (this.isPdf(address)) {
      window.open(this.root + address, "_blank");
      return;
    }
    this.previewUrl = this.root + address;
  }

  async approve(document: KycDocument) {
    await this.review(document, true, null);
  }

  startReject(document: KycDocument) {
    this.rejecting = document;
    this.rejectNote = "";
  }

  async confirmReject() {
    if (this.rejecting == null || !this.rejectNote.trim()) return;
    const ok = await this.review(this.rejecting, false, this.rejectNote.trim());
    if (ok) this.rejecting = null;
  }

  private async review(document: KycDocument, approve: boolean, note: string | null): Promise<boolean> {
    this.busy = true;
    try {
      const result = await firstValueFrom(
        this.reviewGQL.mutate({ variables: { id: document.id, approve, note } }),
      );
      this.done(result.data?.reviewDriverDocument.reinstated ?? false, approve ? "kyc.approved" : "kyc.rejected");
      return true;
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
      return false;
    } finally {
      this.busy = false;
    }
  }

  startTyping(file: LegacyFile) {
    this.typing = file;
    this.form.reset({ typeId: null, number: null, expiresAt: null });
  }

  selectedType(): KycType | undefined {
    return this.types.find((t) => t.id === this.form.value.typeId);
  }

  async submitTyping() {
    const type = this.selectedType();
    if (this.typing == null || type == null || this.busy) return;
    const value = this.form.getRawValue();
    if (type.hasExpiryDate && value.expiresAt == null) {
      this.msg.error(this.translate.instant("kyc.expiryRequired"));
      return;
    }
    this.busy = true;
    try {
      const result = await firstValueFrom(
        this.createGQL.mutate({
          variables: {
            input: {
              driverId: this.driverId,
              typeId: type.id,
              mediaId: this.typing.id,
              number: value.number?.trim() || null,
              expiresAt: toIsoDay(value.expiresAt),
            },
          },
        }),
      );
      this.typing = null;
      this.done(result.data?.createDriverDocument.reinstated ?? false, "kyc.typed");
    } catch (error: any) {
      this.msg.error(financialErrorMessage(error, this.translate));
    } finally {
      this.busy = false;
    }
  }

  /** Les dates passees ne sont pas proposees (document deja expire). */
  disabledPast = (date: Date): boolean => toIsoDay(date)! < toIsoDay(new Date())!;

  /** Message, puis rechargement ; reactivation : en-tete du profil rafraichi. */
  private done(reinstated: boolean, key: string) {
    this.msg.success(this.translate.instant(key));
    if (reinstated) {
      this.msg.success(this.translate.instant("kyc.reinstated"));
      this.routerHelper.refresh(this.route);
    } else {
      this.load();
    }
  }
}
