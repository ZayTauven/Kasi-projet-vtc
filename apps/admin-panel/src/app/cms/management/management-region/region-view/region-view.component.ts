import { Component, OnDestroy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CreateRegionGQL,
  RegionViewQuery,
  UpdateRegionGQL,
} from '@kasi/admin-panel/generated/graphql';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom, Subscription } from 'rxjs';
import { CURRENCY_LIST } from '../../../../currencies';
import { Map as MapboxMap, LngLatBounds } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

@Component({
  selector: 'app-region-view',
  templateUrl: './region-view.component.html',
})
export class RegionViewComponent implements OnDestroy {
  form = this.fb.group({
    id: [null],
    name: [null, Validators.required],
    currency: [null, Validators.required],
    enabled: [true, Validators.required],
    location: [null],
  });

  /** Initial map center [lng, lat] — Mapbox order. */
  center: [number, number] = [12, 24];
  currencies = CURRENCY_LIST;

  /** Coordinate data for polygon rings in backend format: [{lat,lng}][]. */
  polygons: Array<Array<{ lat: number; lng: number }>> = [];

  private mapInstance?: MapboxMap;
  private draw?: MapboxDraw;
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateRegionGQL,
    private updateGQL: UpdateRegionGQL,
    private msg: NzMessageService,
  ) {}

  /** Triggered by (mapLoad) on <mgl-map>. Initialises MapboxDraw and loads existing polygon. */
  onMapLoad(map: MapboxMap): void {
    this.mapInstance = map;

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(this.draw as any);

    // Load existing region data from the route resolver
    this.routeSub = this.route.data.subscribe((data) => {
      if (data['region'] != null) {
        const val: RegionViewQuery = data['region'].data;
        const region = val.region;
        if (region != null) {
          this.form.patchValue(region);
          if (region.location != null) {
            const bounds = new LngLatBounds();
            for (const poly of region.location as Array<Array<{ lat: number; lng: number }>>) {
              // Convert {lat,lng} array to GeoJSON [lng,lat] for MapboxDraw
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
            this.form.patchValue({ location: this.polygons });
            map.fitBounds(bounds, { padding: 50 });
          }
        }
      }
    });

    // New polygon drawn by the user
    map.on('draw.create', (e: any) => {
      for (const feature of e.features) {
        const geoCoords: [number, number][] = feature.geometry.coordinates[0];
        // Convert Mapbox [lng,lat] → backend {lat,lng}
        const ring = geoCoords.map((c) => ({ lat: c[1], lng: c[0] }));
        this.polygons.push(ring);
      }
      this.form.patchValue({ location: this.polygons });
    });

    // Polygon vertex edited
    map.on('draw.update', () => {
      this.rebuildPolygonsFromDraw();
    });

    // Polygon deleted via trash button
    map.on('draw.delete', () => {
      this.rebuildPolygonsFromDraw();
    });
  }

  private rebuildPolygonsFromDraw(): void {
    const features = this.draw!.getAll().features;
    this.polygons = features.map((f: any) =>
      (f.geometry.coordinates[0] as [number, number][]).map((c) => ({
        lat: c[1],
        lng: c[0],
      })),
    );
    this.form.patchValue({ location: this.polygons });
  }

  async onSubmit(): Promise<void> {
    try {
      const { id, location: _loc, ...update } = this.form.value;
      if (id == null) {
        await firstValueFrom(
          this.createGQL.mutate({ input: { ...update, location: this.polygons } }),
        );
      } else {
        await firstValueFrom(
          this.updateGQL.mutate({ id, update: { ...update, location: this.polygons } }),
        );
      }
      this.router.navigate(['management/regions'], { relativeTo: this.route.root });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  clearMap(): void {
    this.draw?.deleteAll();
    this.polygons = [];
    this.form.patchValue({ location: [] });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
