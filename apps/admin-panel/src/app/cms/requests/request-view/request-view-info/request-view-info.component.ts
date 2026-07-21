import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApolloClient } from "@apollo/client/core";
import { ViewOrderQuery } from "@kasi/admin-panel/generated/graphql";
import { TagColorService } from "@kasi/admin-panel/src/app/@services/tag-color/tag-color.service";
import { camelCase } from "camel-case";
import { map, Observable } from "rxjs";
import { CurrentConfigService } from "../../../current-config.service";

@Component({
  selector: "app-request-view-info",
  templateUrl: "./request-view-info.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class RequestViewInfoComponent implements OnInit {
  query?: Observable<ApolloClient.QueryResult<ViewOrderQuery>>;
  public camelCase = camelCase;

  constructor(
    private route: ActivatedRoute,
    public tagColor: TagColorService,
    private currentConfigService: CurrentConfigService,
  ) {}

  ngOnInit(): void {
    this.query = this.route.parent?.data.pipe(map((data) => data.order));
  }

  getMapAddress(points: { lat: number; lng: number }[]): string {
    return `https://maps.googleapis.com/maps/api/staticmap?size=2500x300${points
      .map((x) => {
        return `&markers=color:blue%7Clabel:${points.indexOf(x) + 1}%7C${
          x.lat
        },${x.lng}`;
      })
      .join("")}&key=${this.currentConfigService.currentConfig
      ?.currentConfiguration.adminPanelAPIKey}`;
  }
}
