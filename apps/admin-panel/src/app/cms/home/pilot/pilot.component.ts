import { formatDate, formatNumber } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  LOCALE_ID,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { Chart } from "@antv/g2";
import { TranslateService } from "@ngx-translate/core";
import {
  PilotDashboardGQL,
  PilotDashboardQuery,
  PilotExportGQL,
  PilotIndicatorsFieldsFragment,
  PilotWeekFieldsFragment,
} from "@kasi/admin-panel/generated/graphql";
import { environment } from "@kasi/admin-panel/src/environments/environment";
import { firstValueFrom, Subscription } from "rxjs";
import { TableService } from "../../../@services/table-service";

/**
 * p3-mesures M2 (2026-10-21) : ecran « Pilote » de l'accueil
 * (docs/fiche-mesures-pilote.md §3 et §4).
 *
 * Periode : jours entiers, en UTC (heure de Dakar, sans heure d'ete). Le jour
 * de fin est inclus a l'ecran, exclu cote API (`to` = lendemain 00:00 UTC).
 * Par defaut, les 8 dernieres semaines (lundi de la semaine S-7 a aujourd'hui).
 * La date de debut du pilote se choisit ici et se garde dans le navigateur :
 * la fiche ecarte un reglage serveur.
 *
 * Le filtre tous / personnes / colis porte sur tout l'ecran, sauf l'argent
 * (indicateur 5) que l'API ne donne que tous services confondus.
 */

type Family = "all" | "people" | "parcels";
type Dashboard = PilotDashboardQuery["pilotDashboard"];
type Indicators = PilotIndicatorsFieldsFragment;
type FigureState = "ok" | "ko" | "none";
type ChartRow = { week: string; series: string; value: number };

export interface PilotKeyFigure {
  id: string;
  icon: string;
  labelKey: string;
  value: string;
  footKey?: string;
  footParams?: Record<string, string>;
  thresholdKey?: string;
  thresholdParams?: Record<string, string>;
  state: FigureState;
}

const PILOT_START_STORAGE_KEY = "kasi.pilot.start";
const DAY_MS = 24 * 3600 * 1000;
const COLORS = ["#1285a2", "#f0982e", "#e5484d"];
const THRESHOLD_COLOR = "#e5484d";
const EMPTY = "\u2014";

@Component({
  selector: "app-pilot",
  templateUrl: "./pilot.component.html",
  styleUrl: "./pilot.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PilotComponent implements OnInit, OnDestroy {
  root = environment.root;
  range: Date[] = [];
  pilotStart: Date | null = null;
  family: Family = "all";

  loading = false;
  exporting = false;
  errorKey?: string;
  errorText?: string;

  dashboard?: Dashboard;
  cancelReasons: PilotDashboardQuery["pilotCancelReasons"] = [];
  topKasimen: PilotDashboardQuery["pilotTopKasimen"] = [];
  keyFigures: PilotKeyFigure[] = [];
  current?: Indicators;

  private charts: { orders?: Chart; delay?: Chart; rates?: Chart } = {};
  private langSubscription?: Subscription;

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private dashboardGQL: PilotDashboardGQL,
    private exportGQL: PilotExportGQL,
    private tableService: TableService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem(PILOT_START_STORAGE_KEY);
    this.pilotStart = stored ? new Date(stored) : null;
    this.range = this.lastEightWeeks();
    this.langSubscription = this.translate.onLangChange.subscribe(() =>
      this.renderCharts(),
    );
    this.load();
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  /** Lundi (UTC) de la semaine S-7 jusqu'a aujourd'hui : 8 semaines. */
  private lastEightWeeks(): Date[] {
    const today = new Date();
    const weekday = (today.getUTCDay() + 6) % 7;
    const monday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
        (weekday + 7 * 7) * DAY_MS,
    );
    return [
      new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    ];
  }

  /** Jour choisi (date locale du selecteur) vers minuit UTC. */
  private toUtcDay(day: Date, offsetDays = 0): Date {
    return new Date(
      Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) +
        offsetDays * DAY_MS,
    );
  }

  private period(): { from: Date; to: Date } | null {
    if (this.range?.length !== 2 || !this.range[0] || !this.range[1]) {
      return null;
    }
    return {
      from: this.toUtcDay(this.range[0]),
      to: this.toUtcDay(this.range[1], 1),
    };
  }

  onRangeChange(range: Date[]): void {
    this.range = range;
    this.load();
  }

  useLastEightWeeks(): void {
    this.range = this.lastEightWeeks();
    this.load();
  }

  onPilotStartChange(day: Date | null): void {
    this.pilotStart = day;
    if (day == null) {
      localStorage.removeItem(PILOT_START_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PILOT_START_STORAGE_KEY, day.toISOString());
    this.useSincePilotStart();
  }

  useSincePilotStart(): void {
    if (this.pilotStart == null) return;
    const today = new Date();
    this.range = [
      this.pilotStart,
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    ];
    this.load();
  }

  onFamilyChange(family: Family): void {
    this.family = family;
    this.refreshView();
  }

  async load(): Promise<void> {
    const period = this.period();
    if (period == null) return;
    this.loading = true;
    this.errorKey = undefined;
    this.errorText = undefined;
    try {
      const result = await firstValueFrom(
        this.dashboardGQL.fetch({
          variables: period,
          fetchPolicy: "network-only",
        }),
      );
      if (result.error) throw result.error;
      this.dashboard = result.data!.pilotDashboard;
      this.cancelReasons = result.data!.pilotCancelReasons;
      this.topKasimen = result.data!.pilotTopKasimen;
      this.refreshView();
    } catch (error) {
      this.dashboard = undefined;
      this.current = undefined;
      this.keyFigures = [];
      this.setError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async exportCsv(): Promise<void> {
    const period = this.period();
    if (period == null) return;
    this.exporting = true;
    try {
      const result = await firstValueFrom(
        this.exportGQL.fetch({ variables: period, fetchPolicy: "no-cache" }),
      );
      if (result.error) throw result.error;
      this.tableService.downloadURI(
        environment.root + result.data!.pilotExport.url,
        "pilote-" + period.from.toISOString().slice(0, 10) + ".csv",
      );
    } catch (error) {
      this.setError(error);
    } finally {
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  private setError(error: unknown): void {
    const message = (error as Error)?.message ?? String(error);
    if (message.includes("PILOT_PERIOD_INVALID")) {
      this.errorKey = "pilot.error.period";
    } else if (message.includes("PERMISSION_NOT_GRANTED")) {
      this.errorKey = "pilot.error.permission";
    } else {
      this.errorKey = "pilot.error.generic";
      this.errorText = message;
    }
  }

  private refreshView(): void {
    if (this.dashboard == null) return;
    this.current = this.dashboard.total[this.family];
    this.keyFigures = this.buildKeyFigures(this.dashboard, this.current);
    this.renderCharts();
  }

  // ---------------------------------------------------------------- Format

  pct(rate?: number | null): string {
    if (rate == null) return EMPTY;
    return formatNumber(rate * 100, this.locale, "1.0-1") + " %";
  }

  num(value?: number | null, digits = "1.0-0"): string {
    if (value == null) return EMPTY;
    return formatNumber(value, this.locale, digits);
  }

  duration(seconds?: number | null): string {
    if (seconds == null) return EMPTY;
    const rounded = Math.round(seconds);
    if (rounded < 90) return rounded + " s";
    const minutes = Math.floor(rounded / 60);
    const rest = rounded % 60;
    return rest === 0 ? minutes + " min" : minutes + " min " + rest + " s";
  }

  money(value?: number | null): string {
    if (value == null) return EMPTY;
    const currency = this.dashboard?.currency ?? "";
    return (formatNumber(value, this.locale, "1.0-0") + " " + currency).trim();
  }

  private stateMin(value: number | null | undefined, min: number): FigureState {
    if (value == null) return "none";
    return value >= min ? "ok" : "ko";
  }

  private stateMax(value: number | null | undefined, max: number): FigureState {
    if (value == null) return "none";
    return value <= max ? "ok" : "ko";
  }

  // ---------------------------------------------------------- Key figures

  private buildKeyFigures(d: Dashboard, ind: Indicators): PilotKeyFigure[] {
    const t = d.thresholds;
    const figures: PilotKeyFigure[] = [
      {
        id: "assignment",
        icon: "field-time",
        labelKey: "pilot.figure.assignment",
        value: this.duration(ind.assignment.medianSeconds),
        footKey: "pilot.figure.assignmentFoot",
        footParams: {
          p90: this.duration(ind.assignment.p90Seconds),
          assigned: this.num(ind.assignment.assigned),
        },
        thresholdKey: "pilot.threshold.max",
        thresholdParams: { value: this.duration(t.assignmentMedianMaxSeconds) },
        state: this.stateMax(ind.assignment.medianSeconds, t.assignmentMedianMaxSeconds),
      },
      {
        id: "service",
        icon: "safety-certificate",
        labelKey: "pilot.figure.service",
        value: this.pct(ind.service.rate),
        footKey: "pilot.figure.serviceFoot",
        footParams: {
          assigned: this.num(ind.service.assigned),
          eligible: this.num(ind.service.eligible),
        },
        thresholdKey: "pilot.threshold.min",
        thresholdParams: { value: this.pct(t.serviceRateMin) },
        state: this.stateMin(ind.service.rate, t.serviceRateMin),
      },
      {
        id: "retention",
        icon: "team",
        labelKey: "pilot.figure.retention",
        value: this.pct(ind.kasimen.retentionRate),
        footKey: "pilot.figure.retentionFoot",
        footParams: {
          retained: this.num(ind.kasimen.retained),
          base: this.num(ind.kasimen.retentionBase),
          active: this.num(ind.kasimen.active),
        },
        thresholdKey: "pilot.threshold.min",
        thresholdParams: { value: this.pct(t.kasimanRetentionMin) },
        state: this.stateMin(ind.kasimen.retentionRate, t.kasimanRetentionMin),
      },
    ];
    // Indicateur 5 : tous services seulement, masque sans ProviderWallet_View.
    const money = d.total.all.money;
    if (d.moneyVisible && money != null) {
      figures.push({
        id: "recovery",
        icon: "wallet",
        labelKey: "pilot.figure.recovery",
        value: this.pct(money.recoveryRate),
        footKey: "pilot.figure.recoveryFoot",
        footParams: {
          recovered: this.money(money.commissionRecovered),
          due: this.money(money.commissionDue),
        },
        thresholdKey: "pilot.threshold.min",
        thresholdParams: { value: this.pct(t.cashRecoveryMin) },
        state: this.stateMin(money.recoveryRate, t.cashRecoveryMin),
      });
    }
    figures.push(
      {
        id: "recurring",
        icon: "usergroup-add",
        labelKey: "pilot.figure.recurring",
        value: this.pct(ind.clients.recurringRate),
        footKey: "pilot.figure.recurringFoot",
        footParams: {
          recurring: this.num(ind.clients.recurring),
          active: this.num(ind.clients.active),
        },
        thresholdKey: "pilot.threshold.min",
        thresholdParams: { value: this.pct(t.recurringClientsMin) },
        state: this.stateMin(ind.clients.recurringRate, t.recurringClientsMin),
      },
      {
        id: "completed",
        icon: "car",
        labelKey: "pilot.figure.completed",
        value: this.num(ind.orders.completed),
        footKey: "pilot.figure.completedFoot",
        footParams: { ordered: this.num(ind.orders.ordered) },
        state: "none",
      },
      {
        id: "projection",
        icon: "fund",
        labelKey: "pilot.figure.projection",
        value: this.num(ind.orders.monthlyProjection),
        footKey: "pilot.figure.projectionFoot",
        thresholdKey: "pilot.threshold.breakEven",
        thresholdParams: { value: this.num(t.breakEvenMonthlyOrders) },
        state: this.stateMin(ind.orders.monthlyProjection, t.breakEvenMonthlyOrders),
      },
    );
    return figures;
  }

  // --------------------------------------------------------------- Charts

  onOrdersChartInit(chart: Chart): void {
    this.charts.orders = chart;
    this.renderCharts();
  }

  onDelayChartInit(chart: Chart): void {
    this.charts.delay = chart;
    this.renderCharts();
  }

  onRatesChartInit(chart: Chart): void {
    this.charts.rates = chart;
    this.renderCharts();
  }

  get hasWeeks(): boolean {
    return (this.dashboard?.weeks.length ?? 0) > 0;
  }

  private weekLabel(week: PilotWeekFieldsFragment): string {
    return formatDate(week.weekStart ?? week.start, "d/M", this.locale, "UTC");
  }

  private renderCharts(): void {
    if (this.dashboard == null) return;
    const weeks = this.dashboard.weeks;
    const t = this.dashboard.thresholds;
    const tr = (key: string): string => this.translate.instant(key);
    const family = this.family;
    // Toutes les semaines sur l'axe : une semaine sans attribution ne doit pas
    // rapprocher ses voisines.
    const allWeeks = weeks.map((w) => this.weekLabel(w));

    const orders: ChartRow[] = weeks.flatMap((w) => {
      const o = w[family].orders;
      const week = this.weekLabel(w);
      return [
        { week, series: tr("pilot.chart.ordered"), value: o.ordered },
        { week, series: tr("pilot.chart.completed"), value: o.completed },
        { week, series: tr("pilot.chart.expired"), value: o.expired },
      ];
    });
    this.drawLines(this.charts.orders, orders, allWeeks, { min: 0 });

    const delay: ChartRow[] = [];
    const rates: ChartRow[] = [];
    for (const w of weeks) {
      const ind = w[family];
      const week = this.weekLabel(w);
      if (ind.assignment.medianSeconds != null) {
        delay.push({ week, series: tr("pilot.chart.median"), value: round1(ind.assignment.medianSeconds / 60) });
      }
      if (ind.assignment.p90Seconds != null) {
        delay.push({ week, series: tr("pilot.chart.p90"), value: round1(ind.assignment.p90Seconds / 60) });
      }
      if (ind.service.rate != null) {
        rates.push({ week, series: tr("pilot.chart.serviceRate"), value: round1(ind.service.rate * 100) });
      }
      if (ind.offers.rate != null) {
        rates.push({ week, series: tr("pilot.chart.offerRate"), value: round1(ind.offers.rate * 100) });
      }
    }
    this.drawLines(this.charts.delay, delay, allWeeks, {
      min: 0,
      threshold: round1(t.assignmentMedianMaxSeconds / 60),
      thresholdLabel: tr("pilot.chart.threshold"),
    });
    this.drawLines(this.charts.rates, rates, allWeeks, {
      min: 0,
      max: 100,
      threshold: round1(t.serviceRateMin * 100),
      thresholdLabel: tr("pilot.chart.threshold"),
    });
  }

  private drawLines(
    chart: Chart | undefined,
    rows: ChartRow[],
    allWeeks: string[],
    options: { min?: number; max?: number; threshold?: number; thresholdLabel?: string },
  ): void {
    if (chart == null) return;
    chart.clear();
    chart.annotation().clear(true);
    chart.data(rows);
    // Sans maximum impose, l'axe monte au moins jusqu'au seuil, qui reste visible.
    const max =
      options.max ??
      (options.threshold != null
        ? Math.max(options.threshold * 1.2, ...rows.map((r) => r.value))
        : undefined);
    chart.scale({
      value: { min: options.min, max, nice: true },
      week: { type: "cat", values: allWeeks, range: [0.04, 0.96] },
    });
    chart.tooltip({ shared: true, showCrosshairs: true });
    chart.legend({ position: "top", flipPage: false, itemSpacing: 10 });
    chart.line().position("week*value").color("series", COLORS);
    chart.point().position("week*value").color("series", COLORS).shape("circle").size(3);
    if (options.threshold != null) {
      chart.annotation().line({
        start: ["min", options.threshold],
        end: ["max", options.threshold],
        style: { stroke: THRESHOLD_COLOR, lineDash: [4, 4], lineWidth: 1 },
        text: {
          content: options.thresholdLabel ?? "",
          position: "end",
          offsetY: -4,
          style: { fill: THRESHOLD_COLOR, fontSize: 11, textAlign: "end" },
        },
      });
    }
    chart.render();
  }

  // ---------------------------------------------------------------- Tables

  canceledByKey(canceledBy?: string | null): string {
    switch (canceledBy) {
      case "Rider":
        return "pilot.cancel.byClient";
      case "Driver":
        return "pilot.cancel.byKasiman";
      case "Operator":
        return "pilot.cancel.byOperator";
      default:
        return "pilot.cancel.byUnknown";
    }
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
