import { Component, OnDestroy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  UpdateFleetGQL,
  ViewFleetQuery,
} from '@kasi/admin-panel/generated/graphql';
import { TagColorService } from '@kasi/admin-panel/src/app/@services/tag-color/tag-color.service';
import { COUNTRY_CODE_LIST } from '@kasi/admin-panel/src/app/country-codes';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom, Subscription } from 'rxjs';
import { Map as MapboxMap, LngLatBounds } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

@Component({
  selector: 'app-fleet-view-details',
  templateUrl: './fleet-view-details.component.html',
})
export class FleetViewDetailsComponent implements OnDestroy {
  form = this.fb.group({
    id: [null, Validators.required],
    name: [null, Validators.required],
    phoneNumber: [null, Validators.required],
    mobileNumber: [null, Validators.required],
    accountNumber: [null, Validators.required],
    commissionSharePercent: [0, Validators.required],
    commissionShareFlat: [0, Validators.required],
    feeMultiplier: [null],
    address: [null],
    exclusivityAreas: [null],
  });

  /** Initial map center [lng, lat] — Mapbox order. */
  center: [number, number] = [12, 24];
  countryCodes = COUNTRY_CODE_LIST;

  /** Coordinate rings in backend format: [{lat,lng}][]. */
  polygons: Array<Array<{ lat: number; lng: number }>> = [];

  private mapInstance?: MapboxMap;
  private draw?: MapboxDraw;
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder,
    public tagColor: TagColorService,
    private updateGQL: UpdateFleetGQL,
    private msg: NzMessageService,
    private router: Router,
  ) {}

  /** Triggered by (mapLoad) on <mgl-map>. */
  onMapLoad(map: MapboxMap): void {
    this.mapInstance = map;

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(this.draw as any);

    this.routeSub = this.route.parent!.data.subscribe((data) => {
      if (data['fleet'] != null) {
        const val: ViewFleetQuery = data['fleet'].data;
        const fleet = val.fleet;
        if (fleet != null) {
          this.form.patchValue(fleet);
          const areas = fleet.exclusivityAreas as Array<Array<{ lat: number; lng: number }>> | null;
          if (areas != null && areas.length > 0) {
            const bounds = new LngLatBounds();
            for (const poly of areas) {
              const geoCoords = poly.map((p) => [p.lng, p.lat] as [number, number]);
              this.draw!.add({
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates: [geoCoords] },
              } as any);
              this.polygons.push(poly);
              for (const p of poly) {
                bounds.extend([p.lng, p.lat]);
              }
            }
            map.fitBounds(bounds, { padding: 50 });
          }
        }
      }
    });

    map.on('draw.create', (e: any) => {
      for (const feature of e.features) {
        const geoCoords: [number, number][] = feature.geometry.coordinates[0];
        this.polygons.push(geoCoords.map((c) => ({ lat: c[1], lng: c[0] })));
      }
    });

    map.on('draw.update', () => { this.rebuildPolygons(); });
    map.on('draw.delete', () => { this.rebuildPolygons(); });
  }

  private rebuildPolygons(): void {
    this.polygons = this.draw!.getAll().features.map((f: any) =>
      (f.geometry.coordinates[0] as [number, number][]).map((c) => ({
        lat: c[1],
        lng: c[0],
      })),
    );
  }

  async onSubmit(): Promise<void> {
    const { id, exclusivityAreas: _ignored, ...rest } = this.form.value;
    try {
      await firstValueFrom(
        this.updateGQL.mutate({
          id,
          update: { ...rest, exclusivityAreas: this.polygons },
        }),
      );
      this.msg.success('Success');
      this.router.navigateByUrl('/management/fleets');
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  clearMap(): void {
    this.draw?.deleteAll();
    this.polygons = [];
    this.form.patchValue({ exclusivityAreas: [] });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
