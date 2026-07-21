import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { RiderAddressesQuery } from "@kasi/admin-panel/generated/graphql";
import { TableService } from "@kasi/admin-panel/src/app/@services/table-service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Component({
  selector: "app-rider-view-addresses",
  templateUrl: "./rider-view-addresses.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RiderViewAddressesComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<RiderAddressesQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.addresses));
  }

  openMap(location: { lat: number; lng: number }) {
    var url = "https://maps.google.com/?q=" + location.lat + "," + location.lng;
    window.open(url);
  }
}
