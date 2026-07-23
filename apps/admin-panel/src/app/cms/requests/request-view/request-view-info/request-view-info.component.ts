import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { ViewOrderQuery } from "@kasi/admin-panel/generated/graphql";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { camelCase } from "camel-case";
import { Map as MapboxMap, LngLatBounds } from "mapbox-gl";
import { map, Observable, Subscription } from "rxjs";

@Component({
  selector: "app-request-view-info",
  templateUrl: "./request-view-info.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewInfoComponent implements OnInit, OnDestroy {
  query?: Observable<ApolloClient.QueryResult<ViewOrderQuery>>;
  public camelCase = camelCase;

  // Mini-carte trajet (pickup → destination), remplace l'ancienne image
  // statique Google Static Maps. Cf. pattern fitBounds de
  // overview-drivers-map.component.ts / request-view-assign.component.ts.
  mapInstance?: MapboxMap;
  private pendingFitPoints?: { lat: number; lng: number }[];
  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    public tagColor: TagColorService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(map((data) => data.order));
    this.subscription = this.query?.subscribe((result) => {
      const points = result.data?.order?.points;
      if (points == null) return;
      if (this.mapInstance) {
        this.fitBounds(points);
      } else {
        this.pendingFitPoints = points;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onMapLoad(mapInstance: MapboxMap): void {
    this.mapInstance = mapInstance;
    if (this.pendingFitPoints) {
      this.fitBounds(this.pendingFitPoints);
      this.pendingFitPoints = undefined;
    }
  }

  private fitBounds(points: { lat: number; lng: number }[]): void {
    if (!this.mapInstance) return;
    if (points.length === 0) {
      this.mapInstance.setZoom(1);
      return;
    }
    if (points.length === 1) {
      // panTo attend un LngLatLike — ordre Mapbox [lng, lat]
      this.mapInstance.panTo([points[0].lng, points[0].lat]);
      return;
    }
    const bounds = new LngLatBounds();
    for (const point of points) {
      bounds.extend([point.lng, point.lat]);
    }
    this.mapInstance.fitBounds(bounds, { padding: 50 });
  }
}
