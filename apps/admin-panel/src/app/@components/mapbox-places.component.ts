import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject, Subscription, EMPTY } from "rxjs";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from "rxjs/operators";
import { environment } from "@kasi/admin-panel/src/environments/environment";

interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

@Component({
  selector: "mapbox-places-autocomplete",
  template: `
    <input
      nz-input
      type="text"
      [(ngModel)]="searchText"
      (ngModelChange)="onInput($event)"
      [nzAutocomplete]="autoComplete"
      style="width: 100%; margin-top: 10px; margin-bottom: 10px;"
      placeholder="Search location..."
      />
    <nz-autocomplete #autoComplete (selectionChange)="onSelect($event)">
      @for (feature of suggestions; track feature) {
        <nz-auto-option
          [nzValue]="feature"
          [nzLabel]="feature.place_name"
          >{{ feature.place_name }}</nz-auto-option
          >
        }
      </nz-autocomplete>
    `,
  standalone: false,
})
export class MapboxPlacesComponent implements OnDestroy {
  /** Kept for API compatibility with the former GooglePlacesComponent — not used by Mapbox REST. */
  @Input() adressType: string = "";
  /** Emits { lat, lng } — same interface as the former GooglePlacesComponent consumers expect. */
  @Output() setAddress = new EventEmitter<{ lat: number; lng: number }>();

  searchText = "";
  suggestions: MapboxFeature[] = [];

  private inputSubject = new Subject<string>();
  private sub: Subscription;

  constructor(private http: HttpClient) {
    this.sub = this.inputSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.length < 3) return EMPTY;
          const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
            `${encodeURIComponent(query)}.json` +
            `?access_token=${environment.mapboxToken}&limit=5`;
          return this.http.get<any>(url).pipe(catchError(() => EMPTY));
        }),
      )
      .subscribe((response) => {
        this.suggestions = response?.features ?? [];
      });
  }

  onInput(value: string): void {
    this.inputSubject.next(value);
  }

  onSelect(option: any): void {
    const feature: MapboxFeature = option?.nzValue;
    if (feature?.center) {
      // Mapbox center is [lng, lat] — emit as { lat, lng }
      this.setAddress.emit({ lat: feature.center[1], lng: feature.center[0] });
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
