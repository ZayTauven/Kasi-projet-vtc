import { AfterViewInit, Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { UntypedFormControl } from "@angular/forms";
import { Map as MapboxMap, LngLatBounds } from "mapbox-gl";
import { ActivatedRoute, Router } from "@angular/router";
import { ApolloQueryResult } from "@apollo/client/core";
import { TranslateService } from "@ngx-translate/core";
import {
  AssignDriverToOrderGQL,
  AvailableDriversForOrderQuery,
  DriverSearchGQL,
  Point,
  ViewOrderQuery,
} from "@kasi/admin-panel/generated/graphql";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { camelCase } from "camel-case";
import {
  AutocompleteDataSourceItem,
  NzAutocompleteOptionComponent,
} from "ng-zorro-antd/auto-complete";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzModalService } from "ng-zorro-antd/modal";
import {
  combineLatestWith,
  debounceTime,
  firstValueFrom,
  map,
  Observable,
  Subscription,
  switchMap,
  tap,
} from "rxjs";

@Component({
  selector: "app-request-view-assign",
  templateUrl: "./request-view-assign.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewAssignComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  query?: Observable<
    [
      ApolloQueryResult<AvailableDriversForOrderQuery>,
      ApolloQueryResult<ViewOrderQuery>,
    ]
  >;

  subscription?: Subscription;
  selectedDriver?: AvailableDriversForOrderQuery["getDriversLocationWithData"][number];
  filteredDrivers: AutocompleteDataSourceItem[] = [];

  // Mapbox state
  mapInstance?: MapboxMap;
  popupOpen = false;
  selectedDriverCoords?: [number, number]; // [lng, lat]

  toCamelCase = camelCase;
  searchDriversCtrl = new UntypedFormControl();

  /** Holds locations for fitBounds if data arrives before map loads. */
  private pendingFitLocations?: Point[];

  constructor(
    private route: ActivatedRoute,
    private modalService: NzModalService,
    public tagColor: TagColorService,
    private driversSearchQuery: DriverSearchGQL,
    private msg: NzMessageService,
    private assignDriverToOrderMutation: AssignDriverToOrderGQL,
    private translate: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data
      .pipe<ApolloQueryResult<AvailableDriversForOrderQuery>>(
        map((data) => data.availableDrivers),
      )
      .pipe(
        combineLatestWith(
          this.route.parent!.data.pipe<ApolloQueryResult<ViewOrderQuery>>(
            map((data) => data.order),
          ),
        ),
      );
  }

  ngAfterViewInit(): void {
    this.subscription = this.query?.subscribe((data) => {
      const locations: Point[] = data[0].data.getDriversLocationWithData.map(
        (d) => ({ lat: d.location.lat, lng: d.location.lng }),
      );
      for (const tripPoint of data[1].data.order!.points) {
        locations.push({ lat: tripPoint.lat, lng: tripPoint.lng });
      }
      if (this.mapInstance) {
        this.fitBounds(locations);
      } else {
        // Map not loaded yet — store for when (mapLoad) fires
        this.pendingFitLocations = locations;
      }
    });

    this.searchDriversCtrl.valueChanges
      .pipe(
        debounceTime(500),
        tap(() => {
          this.filteredDrivers = [];
        }),
        switchMap((value) =>
          this.driversSearchQuery.fetch({
            filter: value.value == null ? value : "",
          }),
        ),
      )
      .subscribe((data) => {
        if (data.data.drivers != null) {
          this.filteredDrivers = data.data.drivers.nodes.map((d) => ({
            value: d.id,
            label: `${d.firstName} ${d.lastName} (${d.mobileNumber})`,
          }));
        } else {
          this.msg.error(data.error?.message ?? "unknown error");
        }
      });
  }

  onMapLoad(mapInstance: MapboxMap): void {
    this.mapInstance = mapInstance;
    if (this.pendingFitLocations) {
      this.fitBounds(this.pendingFitLocations);
      this.pendingFitLocations = undefined;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  openPopup(
    driver: AvailableDriversForOrderQuery["getDriversLocationWithData"][number],
  ): void {
    this.selectedDriver = driver;
    // Mapbox [lng, lat] order
    this.selectedDriverCoords = [driver.location.lng, driver.location.lat];
    this.popupOpen = true;
  }

  fitBounds(locations: Point[]): void {
    if (!this.mapInstance) return;
    if (locations.length === 0) {
      this.mapInstance.setZoom(1);
      return;
    }
    if (locations.length === 1) {
      // panTo expects LngLatLike — Mapbox [lng, lat] order
      this.mapInstance.panTo([locations[0].lng, locations[0].lat]);
      return;
    }
    const bounds = new LngLatBounds();
    for (const loc of locations) {
      bounds.extend([loc.lng, loc.lat]);
    }
    this.mapInstance.fitBounds(bounds, { padding: 50 });
  }

  async assignToDriver(driverId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.assignDriverToOrderMutation.mutate({
          orderId: this.route.parent!.snapshot.params.id,
          driverId,
        }),
      );
      this.msg.success(
        this.translate.instant("message.driverAssignedSuccessfully"),
      );
      this.router.navigate(["../info"], { relativeTo: this.route });
    } catch (error: any) {
      this.msg.error(error.message);
    }
  }

  async onItemSelected(
    item: NzAutocompleteOptionComponent | null,
  ): Promise<void> {
    if (item == null) return;
    const driverId = item?.nzValue.value;
    this.modalService.confirm({
      nzTitle: "Confirmation",
      nzContent: `Are you sure you want to assign this trip to ${item.nzLabel}?`,
      nzOnOk: () => {
        this.assignToDriver(driverId);
      },
    });
  }
}
