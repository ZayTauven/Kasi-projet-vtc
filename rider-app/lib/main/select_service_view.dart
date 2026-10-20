import 'dart:async';

import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/components/light_colored_button.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:kasi_rider/notifications/fcm_push_token_provider.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:client_shared/components/kasi_sheet_view.dart';
import 'package:hive/hive.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/main/delivery_details_sheet_view.dart';
import 'package:kasi_rider/main/enter_coupon_code_sheet_view.dart';
import 'package:kasi_rider/main/fare_quote.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/main/reserve_confirmation_sheet_view.dart';
import 'package:kasi_rider/main/reserve_ride_sheet_view.dart';
import 'package:kasi_rider/main/ride_preferences_sheet_view.dart';
import 'package:kasi_rider/query_result_view.dart';
import 'package:kasi_rider/schema.gql.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../main/service_item_view.dart';

import 'bloc/main_bloc.dart';

class SelectServiceView extends StatefulWidget {
  const SelectServiceView({Key? key, required this.data}) : super(key: key);
  final Query$GetFare$getFare data;

  @override
  State<SelectServiceView> createState() => _SelectServiceViewState();
}

class _SelectServiceViewState extends State<SelectServiceView> {
  bool isLoading = false;
  final _pushTokenProvider = FcmPushTokenProvider();

  /// p2-argent I4 : dernier aperçu reçu (prix et devis de chaque service).
  /// Relancé en silence avant l'expiration des devis.
  late Query$GetFare$getFare _fare;

  /// Fin de validité estimée des devis de `_fare` (null : pas de devis).
  DateTime? _quoteDeadline;
  Timer? _refreshTimer;

  /// Relances silencieuses consécutives : bornées pour ne pas créer des devis
  /// sans fin quand l'écran reste ouvert. Au-delà, le devis est relu au moment
  /// de commander.
  int _silentRefreshes = 0;
  static const _maxSilentRefreshes = 5;

  @override
  void initState() {
    super.initState();
    _acceptFare(widget.data);
  }

  @override
  void didUpdateWidget(covariant SelectServiceView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.data, widget.data)) {
      _silentRefreshes = 0;
      _acceptFare(widget.data);
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _acceptFare(Query$GetFare$getFare fare) {
    _fare = fare;
    _refreshTimer?.cancel();
    DateTime? earliest;
    for (final category in fare.services) {
      for (final service in category.services) {
        final expiresAt = service.quoteExpiresAt;
        if (expiresAt != null &&
            (earliest == null || expiresAt.isBefore(earliest))) {
          earliest = expiresAt;
        }
      }
    }
    if (earliest == null) {
      _quoteDeadline = null;
      return;
    }
    final lifetime = quoteLifetime(earliest);
    _quoteDeadline = DateTime.now().add(lifetime);
    if (_silentRefreshes >= _maxSilentRefreshes) return;
    var delay = lifetime - const Duration(seconds: 20);
    if (delay < const Duration(seconds: 5)) delay = const Duration(seconds: 5);
    _refreshTimer = Timer(delay, _silentRefresh);
  }

  bool get _quoteIsFresh =>
      _quoteDeadline != null &&
      _quoteDeadline!.isAfter(DateTime.now().add(const Duration(seconds: 10)));

  /// Relance getFare avant l'expiration des devis, sans loader. Si le prix du
  /// service choisi a changé, le client en est informé avant de confirmer.
  Future<void> _silentRefresh() async {
    if (!mounted) return;
    final state = context.read<MainBloc>().state;
    if (state is! OrderPreview) return;
    if (isLoading) {
      // Commande en cours : elle relit elle-même le devis si besoin.
      _refreshTimer = Timer(const Duration(seconds: 15), _silentRefresh);
      return;
    }
    _silentRefreshes++;
    final client = GraphQLProvider.of(context).value;
    final result = await fetchFare(client, state);
    if (!mounted) return;
    final fare = result.parsedData?.getFare;
    if (fare == null) {
      // Échec (réseau, itinéraire) : nouvel essai plus tard ; le contrôle au
      // moment de commander prend le relais.
      if (_silentRefreshes < _maxSilentRefreshes) {
        _refreshTimer = Timer(const Duration(seconds: 15), _silentRefresh);
      }
      return;
    }
    final current = context.read<MainBloc>().state;
    final selectedId =
        current is OrderPreview ? current.selectedService?.id : null;
    final before =
        selectedId == null ? null : findFareService(_fare, selectedId);
    final after = selectedId == null ? null : findFareService(fare, selectedId);
    setState(() => _acceptFare(fare));
    if (before != null &&
        after != null &&
        displayedFare(before).round() != displayedFare(after).round()) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: KasiBanner(
              S.of(context).fare_price_updated(
                  formatFare(displayedFare(after), fare.currency)),
              type: BannerType.success)));
    }
  }

  bool _isDelivery(Query$GetFare$getFare$services$services service) =>
      service.orderType == Enum$ServiceOrderType.Delivery;

  Future<DeliveryDetails?> _askDeliveryDetails(BuildContext context) {
    return showModalBottomSheet<DeliveryDetails>(
        context: context,
        isScrollControlled: true,
        constraints: const BoxConstraints(maxWidth: 500),
        builder: (context) => const DeliveryDetailsSheetView());
  }

  Future<String?> _getFcmToken(BuildContext context) async {
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission(
      alert: true,
      announcement: true,
      badge: true,
      carPlay: true,
      criticalAlert: false,
      provisional: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      showDialog(
          context: context,
          builder: (context) => AlertDialog(
                title:
                    Text(S.of(context).message_notification_permission_title),
                content: Text(S
                    .of(context)
                    .message_notification_permission_denined_message),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: Text(S.of(context).action_ok),
                  )
                ],
              ));
      return null;
    } else {
      return _pushTokenProvider.getToken();
    }
  }

  /// Relit le devis du service `serviceId` (réservation : à l'heure prévue).
  /// Si le prix diffère de celui que le client a vu, il doit le confirmer.
  /// Renvoie null si le client renonce ou si le devis est impossible.
  Future<Query$GetFare$getFare$services$services?> _refreshQuote(
      OrderPreview state, String serviceId,
      {int? intervalMinutes, required num agreedPrice}) async {
    while (true) {
      final client = GraphQLProvider.of(context).value;
      final result =
          await fetchFare(client, state, intervalMinutes: intervalMinutes);
      if (!mounted) return null;
      final fare = result.parsedData?.getFare;
      final service = fare == null ? null : findFareService(fare, serviceId);
      final routeMissing = (fare != null && service == null) ||
          graphqlErrorCode(result.exception) ==
              FareQuoteErrorCode.routeUnavailable;
      if (routeMissing) {
        if (await showRouteUnavailable(context) && mounted) continue;
        return null;
      }
      if (fare == null || service == null) {
        showOperationErrorMessage(context, result.exception);
        return null;
      }
      if (intervalMinutes == null) {
        _silentRefreshes = 0;
        setState(() => _acceptFare(fare));
      }
      final newPrice = displayedFare(service);
      if (newPrice.round() != agreedPrice.round()) {
        final accepted = await confirmFareChange(context,
            oldPrice: agreedPrice, newPrice: newPrice, currency: fare.currency);
        if (!accepted || !mounted) return null;
      }
      return service;
    }
  }

  /// Course déjà enregistrée (devis consommé, par exemple après un délai
  /// dépassé) : on relit la course en cours au lieu d'en créer une seconde.
  Future<void> _reloadCurrentOrder(MainBloc mainBloc) async {
    final client = GraphQLProvider.of(context).value;
    final info = await PackageInfo.fromPlatform();
    final result = await client.query$GetCurrentOrder(
        Options$Query$GetCurrentOrder(
            fetchPolicy: FetchPolicy.noCache,
            variables: Variables$Query$GetCurrentOrder(
                versionCode: int.tryParse(info.buildNumber) ?? 99999)));
    final data = result.parsedData;
    if (data == null) return;
    mainBloc.add(ProfileUpdated(
        profile: data.rider,
        driverLocation: data.getCurrentOrderDriverLocation));
  }

  /// Commande immédiate (`bookAt` null) ou réservation. Envoie le devis du
  /// service choisi, le coupon et les options ; relit le devis s'il a expiré
  /// ou si le serveur le refuse (QUOTE_EXPIRED, QUOTE_MISMATCH).
  Future<void> _placeOrder({DateTime? bookAt}) async {
    final mainBloc = context.read<MainBloc>();
    final state = mainBloc.state;
    if (state is! OrderPreview || state.selectedService == null) return;
    setState(() => isLoading = true);
    try {
      if (Hive.box('user').get('jwt') == null) {
        Navigator.pushNamed(context, 'login');
        return;
      }
      final serviceId = state.selectedService!.id;
      DeliveryDetails? delivery;
      if (_isDelivery(state.selectedService!)) {
        delivery = await _askDeliveryDetails(context);
        if (delivery == null || !mounted) return;
      }
      final fcmId = await _getFcmToken(context);
      if (!mounted) return;

      var quote = findFareService(_fare, serviceId) ?? state.selectedService!;
      var agreedPrice = displayedFare(quote);
      // Réservation : prix calculé à l'heure prévue. Commande immédiate :
      // devis relu s'il expire dans moins de 10 s.
      var needsQuote =
          bookAt != null || (quote.quoteId != null && !_quoteIsFresh);
      var automaticRetries = 0;
      while (true) {
        final intervalMinutes =
            bookAt == null ? 0 : bookAt.difference(DateTime.now()).inMinutes;
        if (needsQuote) {
          final refreshed = await _refreshQuote(state, serviceId,
              intervalMinutes: bookAt == null ? null : intervalMinutes,
              agreedPrice: agreedPrice);
          if (refreshed == null || !mounted) return;
          quote = refreshed;
          agreedPrice = displayedFare(refreshed);
        }
        final client = GraphQLProvider.of(context).value;
        final result = await client.mutate$CreateOrder(
            Options$Mutation$CreateOrder(
                variables: Variables$Mutation$CreateOrder(
                    input: Input$CreateOrderInput(
                        serviceId: int.parse(serviceId),
                        quoteId: quote.quoteId,
                        couponCode: state.couponCode,
                        optionIds: state.selectedOptions,
                        intervalMinutes: intervalMinutes,
                        points: state
                            .points
                            .map((e) => Input$PointInput(
                                lat: e.latlng.latitude,
                                lng: e.latlng.longitude))
                            .toList(),
                        addresses: state.points.map((e) => e.address).toList(),
                        packageSize: delivery?.packageSize,
                        recipientName: delivery?.recipientName,
                        recipientMobileNumber: delivery?.recipientMobileNumber,
                        deliveryInstructions: delivery?.deliveryInstructions),
                    notificationPlayerId: fcmId ?? '')));
        if (!mounted) return;
        final order = result.parsedData?.createOrder;
        if (!result.hasException && order != null) {
          if (order.status == Enum$OrderStatus.Booked) {
            await showModalBottomSheet(
                context: context,
                constraints: const BoxConstraints(maxWidth: 600),
                builder: (context) => const ReserveConfirmationSheetView());
          } else {
            mainBloc.add(CurrentOrderUpdated(order));
          }
          return;
        }
        switch (graphqlErrorCode(result.exception)) {
          case FareQuoteErrorCode.expired:
          case FareQuoteErrorCode.mismatch:
            if (automaticRetries++ < 2) {
              needsQuote = true;
              continue;
            }
            break;
          case FareQuoteErrorCode.routeUnavailable:
            if (await showRouteUnavailable(context) && mounted) {
              needsQuote = true;
              continue;
            }
            return;
          case FareQuoteErrorCode.alreadyUsed:
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: KasiBanner(S.of(context).fare_order_already_registered,
                    type: BannerType.success)));
            if (bookAt != null) {
              mainBloc.add(ResetState());
            } else {
              await _reloadCurrentOrder(mainBloc);
            }
            return;
        }
        if (!mounted) return;
        showOperationErrorMessage(context, result.exception);
        return;
      }
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return KasiSheetView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          OrderPreviewServices(
              serviceCategories: _fare.services, currency: _fare.currency),
          BlocBuilder<MainBloc, MainBlocState>(
            builder: (context, state) {
              if (state is! OrderPreview) return const SizedBox();
              final disabled = state.selectedService == null || isLoading;
              return Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Row(children: [
                  Expanded(
                      child: ElevatedButton(
                    onPressed: disabled ? null : () => _placeOrder(),
                    child: Text(S.of(context).service_selection_book_now),
                  )),
                  const SizedBox(width: 10),
                  ElevatedButton(
                      style: ButtonStyle(
                          padding: MaterialStateProperty.all(
                              const EdgeInsets.symmetric(vertical: 10))),
                      onPressed: disabled
                          ? null
                          : () async {
                              final dialogResult =
                                  await showModalBottomSheet<DateTime>(
                                      context: context,
                                      constraints:
                                          const BoxConstraints(maxWidth: 600),
                                      builder: (context) =>
                                          const ReserveRideSheetView());
                              if (dialogResult == null || !mounted) return;
                              await _placeOrder(bookAt: dialogResult);
                            },
                      child: const Padding(
                        padding: EdgeInsets.only(bottom: 4),
                        child: Icon(
                          Ionicons.calendar,
                          size: 28,
                        ),
                      )),
                ]),
              );
            },
          )
        ],
      ),
    );
  }
}

class OrderPreviewServices extends StatelessWidget {
  final List<Query$GetFare$getFare$services> serviceCategories;
  final String currency;

  const OrderPreviewServices(
      {required this.serviceCategories, required this.currency, Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final mainBloc = context.read<MainBloc>();
    return DefaultTabController(
      length: serviceCategories.length,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          TabBar(
              dividerColor: Colors.transparent,
              unselectedLabelStyle: Theme.of(context).textTheme.labelMedium,
              labelStyle: Theme.of(context).textTheme.titleSmall,
              isScrollable: true,
              tabs: serviceCategories
                  .map((e) => Tab(
                        height: 28,
                        child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 0),
                            child: Text(e.name)),
                      ))
                  .toList()),
          const Divider(),
          SizedBox(
            height: 225,
            child: TabBarView(
              children: serviceCategories.map((e) {
                return ListView(
                  padding: EdgeInsets.zero,
                  children: e.services
                      .map((e) => ServiceItemView(
                            service: e,
                            isSelected: e.id ==
                                (mainBloc.state as OrderPreview)
                                    .selectedService
                                    ?.id,
                            currency: currency,
                          ))
                      .toList(),
                );
              }).toList(),
            ),
          ),
          const Divider(),
          const SizedBox(height: 4),
          Row(
            children: [
              BlocBuilder<MainBloc, MainBlocState>(
                builder: (context, state) {
                  if (state is! OrderPreview ||
                      state.selectedService == null ||
                      state.selectedService!.options.isEmpty) {
                    return const SizedBox();
                  }
                  return LightColoredButton(
                      icon: Ionicons.options,
                      text: S.of(context).action_ride_preferences,
                      onPressed: () async {
                        final dialogResult = await showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            constraints: const BoxConstraints(maxWidth: 500),
                            builder: (context) {
                              return RidePreferencesSheetView(
                                  state.selectedService!,
                                  state.selectedOptions);
                            });
                        if (dialogResult != null) {
                          final points = state.points;
                          mainBloc.add(ShowPreview(
                              points: points,
                              selectedOptions: dialogResult,
                              couponCode: state.couponCode));
                        }
                      });
                },
              ),
              const Spacer(),
              LightColoredButton(
                  icon: Ionicons.pricetag,
                  text: S.of(context).action_coupon_code,
                  onPressed: () async {
                    final bloc = context.read<MainBloc>();
                    (bloc.state as OrderPreview);
                    final code = await showModalBottomSheet<String>(
                        context: context,
                        isScrollControlled: true,
                        constraints: const BoxConstraints(maxWidth: 500),
                        builder: (context) {
                          return const EnterCouponCodeSheetView();
                        });
                    if (code?.isEmpty ?? true) return;

                    bloc.add(ShowPreview(
                        points: (bloc.state as OrderPreview).points,
                        selectedOptions:
                            (bloc.state as OrderPreview).selectedOptions,
                        couponCode: code));
                  })
            ],
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

typedef ServiceSelectCallback = void Function(
    String serviceId, int intervalMinutes);
