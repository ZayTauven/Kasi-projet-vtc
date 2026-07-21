import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import {
  CreateZonePriceGQL,
  DeleteZonePriceGQL,
  SetZonePriceRelationsGQL,
  TimeMultiplier,
  UpdateZonePriceGQL,
  ZonePriceNewQuery,
  ZonePriceViewQuery,
} from "@kasi/admin-panel/generated/graphql";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzTimePickerComponent } from "ng-zorro-antd/time-picker";
import { firstValueFrom, map, Observable, Subscription } from "rxjs";
import { Map as MapboxMap, LngLatBounds } from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

/**
 * Minimal MapboxDraw style overrides for the destination (to) map.
 * Uses a green colour scheme to visually distinguish it from the default
 * blue pickup map drawn by the other MapboxDraw instance.
 */
const DESTINATION_DRAW_STYLES: object[] = [
  {
    id: "gl-draw-polygon-fill-inactive",
    type: "fill",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    layout: {},
    paint: {
      "fill-color": "#16a34a",
      "fill-outline-color": "#15803d",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: {},
    paint: {
      "fill-color": "#16a34a",
      "fill-outline-color": "#15803d",
      "fill-opacity": 0.3,
    },
  },
  {
    id: "gl-draw-polygon-stroke-inactive",
    type: "line",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#15803d",
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#15803d", "line-width": 2 },
  },
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 3, "circle-color": "#16a34a" },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 5, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 3, "circle-color": "#15803d" },
  },
];

@Component({
  selector: "app-zone-price-view",
  templateUrl: "./zone-price-view.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ZonePriceViewComponent implements OnInit, OnDestroy {
  query?: Observable<ApolloQueryResult<ZonePriceViewQuery | ZonePriceNewQuery>>;
  form = this.fb.group({
    id: [null],
    name: [null, Validators.required],
    from: [[]],
    to: [[]],
    cost: [null, Validators.required],
    fleets: [[]],
    services: [[]],
    timeMultipliers: [[]],
  });
  /** Initial center [lng, lat] — Mapbox order. */
  center: [number, number] = [12, 24];
  @ViewChild("timeStartPicker", { static: false })
  timeStartPicker!: NzTimePickerComponent;
  @ViewChild("timeEndPicker", { static: false })
  timeEndPicker!: NzTimePickerComponent;
  // ng-zorro-antd 21 a retiré l'accès public à l'élément natif de nz-input-number
  // (NzInputNumberComponent.inputElement/value sont maintenant privés) : on lit
  // désormais ce champ via [(ngModel)] plutôt que par accès DOM direct.
  timeMultiplyValue: number | null = null;
  /** Pickup area coordinate rings in backend format {lat,lng}[]. */
  polygonsFrom: Array<Array<{ lat: number; lng: number }>> = [];
  /** Destination area coordinate rings in backend format {lat,lng}[]. */
  polygonsTo: Array<Array<{ lat: number; lng: number }>> = [];

  private mapFromInstance?: MapboxMap;
  private mapToInstance?: MapboxMap;
  private drawFrom?: MapboxDraw;
  private drawTo?: MapboxDraw;
  /**
   * Stored zone-price from the route resolver. Because resolvers run before the
   * component renders, this is always populated before any (mapLoad) fires.
   */
  private storedZonePrice?: ZonePriceViewQuery["zonePrice"];
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: UntypedFormBuilder,
    private createGQL: CreateZonePriceGQL,
    private updateGQL: UpdateZonePriceGQL,
    private relationsGQL: SetZonePriceRelationsGQL,
    private deleteGQL: DeleteZonePriceGQL,
    private msg: NzMessageService,
  ) {}
  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data["zonePrice"]));
    // Populate non-geometric form fields early (resolver guarantees data here).
    this.routeSub = this.route.data.subscribe((data) => {
      if (data["zonePrice"] != null) {
        const val: ZonePriceViewQuery = data["zonePrice"].data;
        const zp = val.zonePrice;
        if (zp != null) {
          this.storedZonePrice = zp;
          this.form.patchValue({
            ...zp,
            services: (zp.services as any[]).map((s: any) => s.id),
            fleets: (zp.fleets as any[]).map((f: any) => f.id),
          } as any);
        }
      }
    });
  }

  // ── Pickup map (default blue MapboxDraw styles) ──────────────────────────

  onMapFromLoad(mapInst: MapboxMap): void {
    this.mapFromInstance = mapInst;
    this.drawFrom = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    mapInst.addControl(this.drawFrom as any);
    if (this.storedZonePrice?.from) {
      this.loadPolygonsIntoMap(
        this.storedZonePrice.from as any,
        this.drawFrom,
        this.polygonsFrom,
        mapInst,
      );
    }
    mapInst.on("draw.create", (e: any) => {
      for (const f of e.features) {
        this.polygonsFrom.push(this.geoToRing(f.geometry.coordinates[0]));
      }
      this.form.patchValue({ from: this.polygonsFrom });
    });
    mapInst.on("draw.update", () => {
      this.polygonsFrom = this.rebuildFromDraw(this.drawFrom!);
      this.form.patchValue({ from: this.polygonsFrom });
    });
    mapInst.on("draw.delete", () => {
      this.polygonsFrom = this.rebuildFromDraw(this.drawFrom!);
      this.form.patchValue({ from: this.polygonsFrom });
    });
  }

  // ── Destination map (green MapboxDraw styles) ────────────────────────────

  onMapToLoad(mapInst: MapboxMap): void {
    this.mapToInstance = mapInst;
    this.drawTo = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: DESTINATION_DRAW_STYLES as any[],
    });
    mapInst.addControl(this.drawTo as any);
    if (this.storedZonePrice?.to) {
      this.loadPolygonsIntoMap(
        this.storedZonePrice.to as any,
        this.drawTo,
        this.polygonsTo,
        mapInst,
      );
    }
    mapInst.on("draw.create", (e: any) => {
      for (const f of e.features) {
        this.polygonsTo.push(this.geoToRing(f.geometry.coordinates[0]));
      }
      this.form.patchValue({ to: this.polygonsTo });
    });
    mapInst.on("draw.update", () => {
      this.polygonsTo = this.rebuildFromDraw(this.drawTo!);
      this.form.patchValue({ to: this.polygonsTo });
    });
    mapInst.on("draw.delete", () => {
      this.polygonsTo = this.rebuildFromDraw(this.drawTo!);
      this.form.patchValue({ to: this.polygonsTo });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private loadPolygonsIntoMap(
    source: Array<Array<{ lat: number; lng: number }>>,
    draw: MapboxDraw,
    target: Array<Array<{ lat: number; lng: number }>>,
    map: MapboxMap,
  ): void {
    const bounds = new LngLatBounds();
    for (const poly of source) {
      const geoCoords = poly.map((p) => [p.lng, p.lat] as [number, number]);
      draw.add({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [geoCoords] },
      } as any);
      target.push(poly);
      for (const p of poly) bounds.extend([p.lng, p.lat]);
    }
    if (source.length > 0) map.fitBounds(bounds, { padding: 50 });
  }

  private geoToRing(
    coords: [number, number][],
  ): Array<{ lat: number; lng: number }> {
    // GeoJSON closed ring already includes the repeated first vertex —
    // kept as-is to match the backend polygon format.
    return coords.map((c) => ({ lat: c[1], lng: c[0] }));
  }

  private rebuildFromDraw(
    draw: MapboxDraw,
  ): Array<Array<{ lat: number; lng: number }>> {
    return draw.getAll().features.map((f: any) =>
      (f.geometry.coordinates[0] as [number, number][]).map((c) => ({
        lat: c[1],
        lng: c[0],
      })),
    );
  }

  async onSubmit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let { id, services, fleets, from: _f, to: _t, ...rest } = this.form.value;
      // Use tracked polygon arrays directly — form fields are secondary storage only.
      const submitData = {
        ...rest,
        from: this.polygonsFrom,
        to: this.polygonsTo,
      };
      if (id == null) {
        const res = await firstValueFrom(
          this.createGQL.mutate({ input: submitData }),
        );
        id = res.data?.createOneZonePrice.id;
      } else {
        const res = await firstValueFrom(
          this.updateGQL.mutate({ id, update: submitData }),
        );
        id = res.data?.updateOneZonePrice.id;
      }
      await firstValueFrom(this.relationsGQL.mutate({ id, services, fleets }));
      this.router.navigate(["management/zone-prices"], {
        relativeTo: this.route.root,
      });
    } catch (error: any) {
      console.log(error);
      this.msg.error(error.message);
    }
  }

  insertTimeRule() {
    if (this.form.value.timeMultipliers == null) {
      this.form.value.timeMultipliers = [];
    }
    this.form.value.timeMultipliers.push({
      startTime: this.timeStartPicker.inputRef.nativeElement.value,
      endTime: this.timeEndPicker.inputRef.nativeElement.value,
      multiply: this.timeMultiplyValue ?? NaN,
    });
  }

  removeTimeRule(_rule: TimeMultiplier) {
    this.form.value.timeMultipliers = this.form.value.timeMultipliers.filter(
      (rule: any) => rule != _rule,
    );
  }

  cancel(): void {
    this.router.navigate(["management/zone-prices"], {
      relativeTo: this.route.root,
    });
  }

  async onDelete(): Promise<void> {
    try {
      const { id } = this.form.value;
      await firstValueFrom(this.deleteGQL.mutate({ id }));
      this.router.navigate(["management/zone-prices"], {
        relativeTo: this.route.root,
      });
      this.msg.success("Zone price deleted successfully");
    } catch (error) {}
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
