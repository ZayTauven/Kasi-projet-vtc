import { formatDate } from "@angular/common";
import {
  AfterViewInit,
  Component,
  Inject,
  LOCALE_ID,
  OnInit,
  ChangeDetectionStrategy
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Chart } from "@antv/g2";
import { ApolloClient } from "@apollo/client/core";
import { TranslateService } from "@ngx-translate/core";
import {
  ChartTimeframe,
  DriverRegistrationsGQL,
  IncomeChartGQL,
  OverviewQuery,
  RequestsChartGQL,
  RiderRegistrationsGQL,
} from "@kasi/admin-panel/generated/graphql";
import { firstValueFrom, map, Observable } from "rxjs";

@Component({
  selector: "app-overview",
  templateUrl: "./overview.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OverviewComponent implements OnInit, AfterViewInit {
  query?: Observable<ApolloClient.QueryResult<OverviewQuery>>;
  incomeMode = 2;
  requestMode = 2;
  driverRegistrationsMode = 2;
  riderRegistrationsMode = 2;

  /**
   * Options du sélecteur de période des graphes. Les libellés étaient codés en
   * dur en anglais ("Daily/Monthly/Yearly") au milieu d'un tableau de bord
   * francais : ils passent par l'i18n et se resynchronisent au changement de
   * langue. L'ordre du tableau est significatif (`*Mode` indexe dedans).
   */
  chartTimeOptions: { label: string; value: ChartTimeframe }[] = [
    { label: "", value: ChartTimeframe.Daily },
    { label: "", value: ChartTimeframe.Monthly },
    { label: "", value: ChartTimeframe.Yearly },
  ];

  private chartRequests!: Chart;
  private chartIncome!: Chart;
  private chartDriverRegistrations!: Chart;
  private chartRiderRegistrations!: Chart;

  isChartIncomeEmpty = false;
  isChartRequestsEmpty = false;
  isChartDriverRegistrationsEmpty = false;
  isChartRiderRegistrationsEmpty = false;

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private route: ActivatedRoute,
    private incomeChartGQL: IncomeChartGQL,
    private requestsChartGQL: RequestsChartGQL,
    private driverRegistrationsChartGQL: DriverRegistrationsGQL,
    private riderRegistrationsChartGQL: RiderRegistrationsGQL,
    private translateService: TranslateService,
  ) {}

  ngAfterViewInit(): void {
    this.refreshIncome();
    this.refreshRequests();
    this.refreshDriverRegistrations();
    this.refreshRiderRegistrations();
  }

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.overview));
    this.translateService
      .stream([
        "overview.chart.daily",
        "overview.chart.monthly",
        "overview.chart.yearly",
      ])
      .subscribe((labels) => {
        this.chartTimeOptions = [
          {
            label: labels["overview.chart.daily"],
            value: ChartTimeframe.Daily,
          },
          {
            label: labels["overview.chart.monthly"],
            value: ChartTimeframe.Monthly,
          },
          {
            label: labels["overview.chart.yearly"],
            value: ChartTimeframe.Yearly,
          },
        ];
      });
  }

  async refreshIncome() {
    const result = await firstValueFrom(
      this.incomeChartGQL.fetch({ variables: {
        timeframe: this.chartTimeOptions[this.incomeMode].value,
      } }),
    );
    this.isChartIncomeEmpty = result.data!.incomeChart.length == 0;
    if (this.isChartIncomeEmpty) {
      this.chartIncome.clear();
      return;
    }
    const timeFormat = this.getTimeFormatForQuery(
      this.chartTimeOptions[this.incomeMode].value,
    );
    result.data!.incomeChart.forEach((result) => {
      result.time = formatDate(result.time, timeFormat, this.locale);
      result.sum = parseFloat(result.sum.toFixed(2));
    });
    this.chartIncome.data(result.data!.incomeChart);
    this.chartIncome.interval().position("time*sum").color("currency");
    this.chartIncome.render();
    this.chartIncome.interaction("active-region");
  }

  async refreshRequests() {
    const result = await firstValueFrom(
      this.requestsChartGQL.fetch({ variables: {
        timeframe: this.chartTimeOptions[this.requestMode].value,
      } }),
    );
    this.isChartRequestsEmpty = result.data!.requestChart.length == 0;
    if (this.isChartRequestsEmpty) {
      this.chartRequests.clear();
      return;
    }
    const timeFormat = this.getTimeFormatForQuery(
      this.chartTimeOptions[this.requestMode].value,
    );
    result.data!.requestChart.forEach((result) => {
      result.time = formatDate(result.time, timeFormat, this.locale);
      result.count = parseFloat(result.count.toString());
      result.status = this.translateService.instant(
        `enum.request.${result.status}`,
      );
    });
    this.chartRequests.data(result.data!.requestChart);
    this.chartRequests
      .interval()
      .adjust("stack")
      .position("time*count")
      .color("status");
    this.chartRequests.render();
    this.chartRequests.interaction("active-region");
  }

  async refreshDriverRegistrations() {
    const result = await firstValueFrom(
      this.driverRegistrationsChartGQL.fetch({ variables: {
        timeframe: this.chartTimeOptions[this.driverRegistrationsMode].value,
      } }),
    );
    this.isChartDriverRegistrationsEmpty =
      result.data!.driverRegistrations.length == 0;
    if (this.isChartDriverRegistrationsEmpty) {
      this.chartDriverRegistrations.clear();
      return;
    }
    const timeFormat = this.getTimeFormatForQuery(
      this.chartTimeOptions[this.driverRegistrationsMode].value,
    );
    result.data!.driverRegistrations.forEach((result) => {
      result.time = formatDate(result.time, timeFormat, this.locale);
      result.count = parseFloat(result.count.toString());
    });
    this.chartDriverRegistrations.data(result.data!.driverRegistrations);
    this.chartDriverRegistrations
      .interval()
      .position("time*count")
      .color("count", ["red", "orange", "green"]);
    this.chartDriverRegistrations.render();
    this.chartDriverRegistrations.interaction("active-region");
  }

  async refreshRiderRegistrations() {
    const result = await firstValueFrom(
      this.riderRegistrationsChartGQL.fetch({ variables: {
        timeframe: this.chartTimeOptions[this.riderRegistrationsMode].value,
      } }),
    );
    this.isChartRiderRegistrationsEmpty =
      result.data!.riderRegistrations.length == 0;
    if (this.isChartRiderRegistrationsEmpty) {
      this.chartRiderRegistrations.clear();
      return;
    }
    const timeFormat = this.getTimeFormatForQuery(
      this.chartTimeOptions[this.riderRegistrationsMode].value,
    );
    result.data!.riderRegistrations.forEach((result) => {
      result.time = formatDate(result.time, timeFormat, this.locale);
      result.count = parseFloat(result.count.toString());
    });
    this.chartRiderRegistrations.data(result.data!.riderRegistrations);
    this.chartRiderRegistrations
      .interval()
      .position("time*count")
      .color("count", ["red", "orange", "green"]);
    this.chartRiderRegistrations.render();
    this.chartRiderRegistrations.interaction("active-region");
  }

  /**
   * Format des abscisses des graphes. Les formats hérités étaient des formats
   * US (`M/d`, heure sur 12 h) : passés en convention francaise (jour/mois,
   * heure sur 24 h). Le nom des mois suit `LOCALE_ID`.
   */
  getTimeFormatForQuery(q: ChartTimeframe): string {
    switch (q) {
      case ChartTimeframe.Daily:
        return "H'h'";
      case ChartTimeframe.Weekly:
        return "W,y";
      case ChartTimeframe.Monthly:
        return "d/M";
      case ChartTimeframe.Yearly:
        return "MMM y";
    }
  }

  onChartRequestsInit(chartInstance: Chart): void {
    this.chartRequests = chartInstance;
  }

  onChartIncomeInit(chartInstance: Chart): void {
    this.chartIncome = chartInstance;
  }

  onChartDriverRegistrationsInit(chartInstance: Chart): void {
    this.chartDriverRegistrations = chartInstance;
  }

  onChartRiderRegistrationsInit(chartInstance: Chart): void {
    this.chartRiderRegistrations = chartInstance;
  }
}
