import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { DispatcherService, PointWithAddress } from "../dispatcher.service";
import { Map as MapboxMap, LngLatBounds } from "mapbox-gl";
import { environment } from "@kasi/admin-panel/src/environments/environment";
import { firstValueFrom, EMPTY } from "rxjs";
import { catchError } from "rxjs/operators";

@Component({
  selector: "app-dispatcher-locations-select",
  templateUrl: "./dispatcher-locations-select.component.html",
  styles: [],
  standalone: false,
})
export class DispatcherLocationsSelectComponent {
  points: PointWithAddress[] = [];
  drivers: any[] = [];
  mapInstance?: MapboxMap;

  constructor(
    private messageService: NzMessageService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private dispatcherService: DispatcherService,
    private http: HttpClient,
  ) {}

  onMapLoad(mapInst: MapboxMap): void {
    this.mapInstance = mapInst;
    this.centerMap();
  }

  /** Called by mapbox-places-autocomplete — emits { lat, lng } directly. */
  getAddress(point: { lat: number; lng: number }): void {
    if (this.mapInstance) {
      // Mapbox panTo expects [lng, lat]
      this.mapInstance.panTo([point.lng, point.lat]);
    }
  }

  removeLastPoint(): void {
    this.points.pop();
  }

  async mapClicked(e: any): Promise<void> {
    const { lng, lat } = e.lngLat;
    const id = this.messageService.loading(
      this.translate.instant("dispatcher.determiningLocation"),
      { nzDuration: 0 },
    ).messageId;
    try {
      // Mapbox reverse-geocoding: coordinates are passed as lng,lat in the URL
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${lng},${lat}.json` +
        `?access_token=${environment.mapboxToken}&limit=1`;
      const response = await firstValueFrom(
        this.http.get<any>(url).pipe(catchError(() => EMPTY)),
      );
      const address =
        response?.features?.[0]?.place_name ??
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      this.points.push({ location: { lat, lng }, address });
    } finally {
      this.messageService.remove(id);
    }
  }

  goToServiceSelection(): void {
    this.router.navigate(["../service-select"], {
      relativeTo: this.route,
      queryParams: {
        points: this.dispatcherService.serializePoints(this.points),
      },
      queryParamsHandling: "merge",
    });
  }

  centerMap(): void {
    if (!this.mapInstance) return;
    if (this.drivers.length === 0) {
      this.mapInstance.setZoom(1);
      return;
    }
    if (this.drivers.length === 1) {
      this.mapInstance.setCenter([
        this.drivers[0].location.lng,
        this.drivers[0].location.lat,
      ]);
      this.mapInstance.setZoom(16);
      return;
    }
    const bounds = new LngLatBounds();
    for (const driver of this.drivers) {
      bounds.extend([driver.location.lng, driver.location.lat]);
    }
    this.mapInstance.fitBounds(bounds, { padding: 50 });
  }
}
