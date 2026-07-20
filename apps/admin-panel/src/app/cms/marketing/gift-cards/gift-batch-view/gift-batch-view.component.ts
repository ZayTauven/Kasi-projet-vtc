import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  GiftBatchCodesGQL,
  GiftBatchCodesQuery,
  ViewGiftBatchQuery,
} from "@kasi/admin-panel/generated/graphql";
import { firstValueFrom, map, Observable } from "rxjs";

type GiftBatch = NonNullable<ViewGiftBatchQuery["giftBatch"]>;
type GiftCardConnection = NonNullable<
  GiftBatchCodesQuery["giftBatch"]
>["giftCards"];

@Component({
  selector: "app-gift-batch-view",
  templateUrl: "./gift-batch-view.component.html",
  standalone: false,
})
export class GiftBatchViewComponent implements OnInit {
  batch$?: Observable<GiftBatch | undefined>;

  /** Codes du lot ; renseigne uniquement si l'operateur a GiftCards_ViewCodes. */
  codes?: GiftCardConnection;
  /** true = l'operateur possede GiftCards_ViewCodes (requete codes reussie). */
  canViewCodes = false;
  codesLoading = true;

  constructor(
    private route: ActivatedRoute,
    private codesGQL: GiftBatchCodesGQL,
  ) {}

  ngOnInit(): void {
    this.batch$ = this.route.data.pipe(
      map((data) => data.giftBatch?.data?.giftBatch),
    );
    this.loadCodes(this.route.snapshot.params.id);
  }

  /**
   * Charge les codes via une requete DISTINCTE (GiftBatchCodes). Cote backend,
   * la relation giftCards est protegee par GiftCardAuthorizer (permission
   * GiftCards_ViewCodes) : sans cette permission, la requete leve
   * UnauthorizedException. On s'appuie donc sur ce refus serveur comme garde :
   * succes => affichage des codes ; erreur => section masquee (aucune fuite,
   * pas de toast d'erreur car c'est un cas nominal pour un operateur restreint).
   */
  private async loadCodes(id: string): Promise<void> {
    this.codesLoading = true;
    try {
      const res = await firstValueFrom(
        this.codesGQL.fetch(
          { id, paging: { limit: 500 } },
          { errorPolicy: "none", fetchPolicy: "network-only" },
        ),
      );
      this.codes = res.data?.giftBatch?.giftCards;
      this.canViewCodes = true;
    } catch (error: any) {
      // Le refus d'autorisation serveur (GiftCards_ViewCodes) est un cas
      // NOMINAL pour un operateur restreint : on masque simplement la section.
      this.canViewCodes = false;
      this.codes = undefined;
    } finally {
      this.codesLoading = false;
    }
  }
}
