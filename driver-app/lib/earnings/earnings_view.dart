import 'dart:math';

import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/components/empty_state_card_view.dart';
import 'package:client_shared/components/query_result_view.dart';
import 'package:client_shared/components/trip_history_item_view.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:kasi_driver/earnings/earnings.graphql.dart';
import 'package:intl/intl.dart';

import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/schema.gql.dart';

/// Deux modes de lecture des gains.
///
/// Le backend (`earnings.service.ts`) ne propose pas de bucket infra-journalier.
/// Granularité minimale = le JOUR (`GROUP BY DATE(requestTimestamp)`).
/// On mappe donc :
///  - [day]   -> timeframe Daily  sur une fenêtre de 7 jours (1 barre / jour)
///  - [month] -> timeframe Monthly sur une fenêtre d'année  (1 barre / mois)
enum EarningsPeriod { day, month }

class EarningsView extends StatefulWidget {
  const EarningsView({Key? key}) : super(key: key);

  @override
  State<EarningsView> createState() => _EarningsViewState();
}

class _EarningsViewState extends State<EarningsView> {
  EarningsPeriod _period = EarningsPeriod.day;
  late DateTime _startDate;
  late DateTime _endDate;

  @override
  void initState() {
    super.initState();
    _applyDayWindowForNow();
  }

  // ---------------------------------------------------------------------------
  // Gestion de la fenêtre temporelle
  // ---------------------------------------------------------------------------

  Enum$TimeQuery get _timeframe => _period == EarningsPeriod.day
      ? Enum$TimeQuery.Daily
      : Enum$TimeQuery.Monthly;

  void _applyDayWindowForNow() {
    final now = DateTime.now();
    _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
    _startDate = _endDate.subtract(const Duration(days: 6));
    _startDate =
        DateTime(_startDate.year, _startDate.month, _startDate.day, 0, 0, 0);
  }

  void _applyMonthWindowForYear(int year) {
    _startDate = DateTime(year, 1, 1, 0, 0, 0);
    _endDate = DateTime(year, 12, 31, 23, 59, 59);
  }

  void _selectPeriod(EarningsPeriod period) {
    if (period == _period) return;
    setState(() {
      _period = period;
      if (period == EarningsPeriod.day) {
        _applyDayWindowForNow();
      } else {
        _applyMonthWindowForYear(DateTime.now().year);
      }
    });
  }

  void _goPrevious() {
    setState(() {
      if (_period == EarningsPeriod.day) {
        _endDate = _startDate.subtract(const Duration(seconds: 1));
        _startDate = DateTime(_endDate.year, _endDate.month, _endDate.day)
            .subtract(const Duration(days: 6));
      } else {
        _applyMonthWindowForYear(_startDate.year - 1);
      }
    });
  }

  void _goNext() {
    setState(() {
      if (_period == EarningsPeriod.day) {
        _startDate = _endDate.add(const Duration(seconds: 1));
        _startDate =
            DateTime(_startDate.year, _startDate.month, _startDate.day);
        _endDate = _startDate
            .add(const Duration(days: 6))
            .copyWithEndOfDay();
      } else {
        _applyMonthWindowForYear(_startDate.year + 1);
      }
    });
  }

  bool get _canGoNext {
    final now = DateTime.now();
    if (_period == EarningsPeriod.day) {
      return _endDate.isBefore(now);
    }
    return _startDate.year < now.year;
  }

  String get _periodLabel {
    if (_period == EarningsPeriod.day) {
      return "${DateFormat('MMMd').format(_startDate)} - ${DateFormat('MMMd').format(_endDate)}";
    }
    return DateFormat('yyyy').format(_startDate);
  }

  // ---------------------------------------------------------------------------
  // Formatage
  // ---------------------------------------------------------------------------

  String _durationLabel(double seconds) {
    final d = Duration(seconds: seconds.round());
    final h = d.inHours;
    final m = d.inMinutes % 60;
    return h > 0 ? '${h}h ${m}m' : '${m}m';
  }

  /// Libellé de l'axe X selon le mode.
  /// - day  : `name` = nom du jour (ex "Monday") -> 3 premières lettres.
  /// - month: `name` = 'YYYY/M' -> abréviation du mois localisée.
  String _barLabel(String name) {
    if (_period == EarningsPeriod.day) {
      return name.substring(0, min(3, name.length));
    }
    final parts = name.split('/');
    final monthNum = int.tryParse(parts.isNotEmpty ? parts.last : '');
    if (monthNum == null || monthNum < 1 || monthNum > 12) return name;
    return DateFormat('MMM').format(DateTime(0, monthNum));
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            KasiBackButton(text: S.of(context).action_back),
            const SizedBox(height: 12),
            _buildToggle(context),
            const SizedBox(height: 16),
            _buildPeriodNavigator(context),
            const SizedBox(height: 16),
            Query$GetStats$Widget(
                options: Options$Query$GetStats(
                    variables: Variables$Query$GetStats(
                        timeframe: _timeframe,
                        startDate: _startDate,
                        endDate: _endDate)),
                builder: (result, {refetch, fetchMore}) {
                  if (result.isLoading || result.hasException) {
                    return Expanded(
                        child: QueryResultLoadingView(
                      loadingText: S.of(context).loading,
                    ));
                  }
                  final stats = result.parsedData;
                  if (stats == null ||
                      (stats.getStatsNew.dataset.isEmpty)) {
                    return EmptyStateCard(
                        title: S.of(context).empty_state_title_no_record,
                        description: S.of(context).earnings_empty_state_body,
                        icon: Ionicons.cloud_offline);
                  }
                  return Expanded(child: _buildContent(context, stats));
                })
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Query$GetStats stats) {
    final dataset = stats.getStatsNew.dataset;
    final currency = stats.getStatsNew.currency;

    final totalEarning = dataset.fold<double>(0, (s, d) => s + d.earning);
    final totalCount = dataset.fold<double>(0, (s, d) => s + d.count);
    final totalDistance = dataset.fold<double>(0, (s, d) => s + d.distance);
    final totalTime = dataset.fold<double>(0, (s, d) => s + d.time);

    final currencyFormat = NumberFormat.simpleCurrency(name: currency);

    // Indice de la barre "courante" (mise en avant orange).
    // En mode mois, `name == current` identifie le mois en cours (même format).
    // En mode jour, les formats diffèrent côté backend -> on met en avant la
    // dernière barre (période la plus récente) par défaut.
    int highlightIndex = dataset.length - 1;
    for (var i = 0; i < dataset.length; i++) {
      if (dataset[i].name == dataset[i].current) {
        highlightIndex = i;
        break;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          currencyFormat.format(totalEarning),
          style: Theme.of(context)
              .textTheme
              .displaySmall
              ?.copyWith(color: CustomTheme.primaryColors.shade700),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                icon: Ionicons.car_outline,
                label: S.of(context).earnings_kpi_trips,
                value: totalCount.toInt().toString(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _KpiCard(
                icon: Ionicons.navigate_outline,
                label: S.of(context).earnings_kpi_distance,
                value: S
                    .of(context)
                    .distanceKm((totalDistance / 1000).toStringAsFixed(1)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _KpiCard(
                icon: Ionicons.time_outline,
                label: S.of(context).earnings_kpi_time,
                value: _durationLabel(totalTime),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 180,
          child: _buildChart(context, dataset, currencyFormat, highlightIndex),
        ),
        const SizedBox(height: 12),
        const Divider(),
        Expanded(
          child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: stats.orders.edges.length,
              itemBuilder: ((context, index) {
                final item = stats.orders.edges[index].node;
                return TripHistoryItemView(
                    id: item.id,
                    canceledText: S.of(context).order_status_canceled,
                    title: item.service?.name ?? "-",
                    dateTime: item.createdOn,
                    currency: item.currency,
                    price: item.costAfterCoupon - item.providerShare,
                    isCanceled:
                        item.status == Enum$OrderStatus.RiderCanceled ||
                            item.status == Enum$OrderStatus.DriverCanceled,
                    onPressed: (id) {});
              })),
        )
      ],
    );
  }

  Widget _buildChart(
    BuildContext context,
    List<Query$GetStats$getStatsNew$dataset> dataset,
    NumberFormat currencyFormat,
    int highlightIndex,
  ) {
    final rodWidth = dataset.length > 8 ? 12.0 : 18.0;
    var index = 0;
    final barData = dataset.map<BarChartGroupData>((data) {
      final i = index++;
      final isHighlight = i == highlightIndex;
      return BarChartGroupData(x: i, barRods: [
        BarChartRodData(
          borderRadius: BorderRadius.circular(6),
          width: rodWidth,
          toY: data.earning,
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isHighlight
                ? [
                    CustomTheme.secondaryColors.shade400,
                    CustomTheme.secondaryColors,
                  ]
                : [
                    CustomTheme.primaryColors.shade400,
                    CustomTheme.primaryColors.shade700,
                  ],
          ),
        )
      ]);
    }).toList();

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
          tooltipBgColor: CustomTheme.neutralColors.shade800,
          getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
              currencyFormat.format(dataset[groupIndex].earning),
              const TextStyle(color: Colors.white)),
        )),
        barGroups: barData,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
              sideTitles: SideTitles(
            reservedSize: 28,
            showTitles: true,
            getTitlesWidget: (value, meta) {
              final i = value.toInt();
              if (i < 0 || i >= dataset.length) return const SizedBox();
              return Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  _barLabel(dataset[i].name),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              );
            },
          )),
        ),
      ),
      swapAnimationDuration: const Duration(milliseconds: 250),
    );
  }

  Widget _buildToggle(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: CustomTheme.neutralColors.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          _toggleSegment(context, S.of(context).earnings_toggle_day,
              EarningsPeriod.day),
          _toggleSegment(context, S.of(context).earnings_toggle_month,
              EarningsPeriod.month),
        ],
      ),
    );
  }

  Widget _toggleSegment(
      BuildContext context, String label, EarningsPeriod period) {
    final selected = _period == period;
    return Expanded(
      child: GestureDetector(
        onTap: () => _selectPeriod(period),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? CustomTheme.primaryColors : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: selected
                      ? Colors.white
                      : CustomTheme.neutralColors.shade600,
                ),
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodNavigator(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _goPrevious,
          child: Icon(Ionicons.chevron_back,
              color: CustomTheme.primaryColors.shade700),
        ),
        Text(
          _periodLabel,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _canGoNext ? _goNext : null,
          child: Icon(Ionicons.chevron_forward,
              color: _canGoNext
                  ? CustomTheme.primaryColors.shade700
                  : CustomTheme.neutralColors.shade300),
        ),
      ],
    );
  }
}

extension _EndOfDay on DateTime {
  DateTime copyWithEndOfDay() => DateTime(year, month, day, 23, 59, 59);
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _KpiCard({
    required this.icon,
    required this.label,
    required this.value,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CustomTheme.neutralColors.shade200),
        boxShadow: [
          BoxShadow(
            color: CustomTheme.neutralColors.shade100,
            blurRadius: 8,
            offset: const Offset(0, 2),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: CustomTheme.primaryColors.shade600, size: 22),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}
