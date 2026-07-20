import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { Map as MapboxMap, LngLatBounds } from "mapbox-gl";
import { camelCase } from "camel-case";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import {
  DriverLocationFragment,
  DriverOverviewInfoFragment,
  OverviewDriverPagingGQL,
  OverviewQuery,
} from "@kasi/admin-panel/generated/graphql";
import { firstValueFrom, map, Observable, Subscription } from "rxjs";
import { ApolloQueryResult } from "@apollo/client/core";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-overview-drivers-map",
  templateUrl: "./overview-drivers-map.component.html",
  standalone: false,
})
export class OverviewDriversMapComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // Table
  page = 1;
  listOfData: DriverOverviewInfoFragment[] = [];
  locations: DriverLocationFragment[] = [];

  // Map state
  autoZoom = false;
  query?: Observable<ApolloQueryResult<OverviewQuery>>;
  subscription?: Subscription;
  mapInstance?: MapboxMap;
  selectedDriverId!: number;
  selectedDriverCoords?: [number, number]; // [lng, lat] — Mapbox order
  popupOpen = false;

  constructor(
    public tagColor: TagColorService,
    private route: ActivatedRoute,
    private overviewDriversPaging: OverviewDriverPagingGQL,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.overview));
  }

  ngAfterViewInit(): void {
    this.subscription = this.query?.subscribe((data) => {
      this.locations = data.data.getDriversLocation;
      this.searchData();
      this.centerMap();
    });
  }

  onMapLoad(mapInstance: MapboxMap): void {
    this.mapInstance = mapInstance;
    // Re-center in case locations arrived before the map finished loading
    this.centerMap();
  }

  centerMap(): void {
    if (!this.mapInstance) return;
    if (this.locations.length === 0) {
      this.mapInstance.setZoom(1);
      return;
    }
    if (this.locations.length === 1) {
      this.mapInstance.panTo([
        this.locations[0].location.lng,
        this.locations[0].location.lat,
      ]);
      return;
    }
    const bounds = new LngLatBounds();
    for (const loc of this.locations) {
      bounds.extend([loc.location.lng, loc.location.lat]);
    }
    this.mapInstance.fitBounds(bounds, { padding: 50 });
  }

  openPopup(driverId: number, location: { lat: number; lng: number }): void {
    this.selectedDriverId = driverId;
    // Mapbox uses [lng, lat] order
    this.selectedDriverCoords = [location.lng, location.lat];
    this.popupOpen = true;
  }

  showDriverOnMap(id: string): void {
    const loc = this.locations.find((x) => x.driverId === parseInt(id))
      ?.location;
    if (!loc || !this.mapInstance) return;
    // Tight bbox around the driver to zoom in
    const bounds = new LngLatBounds(
      [loc.lng - 0.001, loc.lat - 0.001],
      [loc.lng + 0.001, loc.lat + 0.001],
    );
    this.mapInstance.fitBounds(bounds, { padding: 20 });
  }

  toCamelCase(value: string): string {
    return camelCase(value);
  }

  async searchData(): Promise<void> {
    if (this.locations.length === 0) return;
    const result = await firstValueFrom(
      this.overviewDriversPaging.fetch({
        ids: this.locations
          .slice((this.page - 1) * 5, this.page * 5 - 1)
          .map((x) => x.driverId.toString()),
      }),
    );
    this.listOfData = result.data.drivers.nodes;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
