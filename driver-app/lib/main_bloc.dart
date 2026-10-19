import 'package:collection/collection.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';
import 'package:kasi_driver/graphql/order.fragment.graphql.dart';
import 'package:kasi_driver/main.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

abstract class MainEvent {}

class DriverUpdated extends MainEvent {
  Fragment$BasicProfile driver;

  DriverUpdated(this.driver);
}

class VersionStatusEvent extends MainEvent {
  Enum$VersionStatus status;
  VersionStatusEvent(this.status);
}

class AvailableOrdersUpdated extends MainEvent {
  List<Fragment$AvailableOrder> orders;

  /// Joue la sonnerie si la liste contient une offre absente jusqu'ici.
  /// Activé par la relecture périodique (p1-resync) : une offre dont la
  /// diffusion initiale a été manquée doit être signalée comme une nouvelle
  /// offre, sinon un Kasiman qui ne regarde pas l'écran ne la voit pas.
  final bool notifyNew;

  AvailableOrdersUpdated(this.orders, {this.notifyNew = false});
}

class AvailabledOrderAdded extends MainEvent {
  Fragment$AvailableOrder order;

  AvailabledOrderAdded(this.order);
}

class AvailableOrderRemoved extends MainEvent {
  Fragment$AvailableOrder order;

  AvailableOrderRemoved(this.order);
}

class SelectedOrderChanged extends MainEvent {
  int index;

  SelectedOrderChanged(this.index);
}

class CurrentOrderUpdated extends MainEvent {
  Fragment$CurrentOrder order;

  CurrentOrderUpdated(this.order);
}

abstract class MainState extends Equatable {
  final Fragment$BasicProfile? driver;
  final List<MarkerData> markers;

  const MainState(this.driver, this.markers);
}

class StatusUnregistered extends MainState {
  StatusUnregistered(driver) : super(driver, []);

  @override
  List<Object?> get props => [driver];
}

class StatusOffline extends MainState {
  StatusOffline(Fragment$BasicProfile? driver) : super(driver, []);

  @override
  List<Object?> get props => [driver];
}

class RequireUpdateState extends MainState {
  RequireUpdateState() : super(null, []);

  @override
  List<Object?> get props => [];
}

class StatusOnline extends MainState {
  final List<Fragment$AvailableOrder> orders;
  final Fragment$AvailableOrder? selectedOrder;

  StatusOnline({driver, required this.orders, this.selectedOrder})
      : super(
            driver,
            selectedOrder != null
                ? selectedOrder.points
                    .asMap()
                    .entries
                    .map((e) => MarkerData(
                        id: e.value.lat.toString(),
                        position: LatLng(e.value.lat, e.value.lng),
                        address: selectedOrder.addresses[e.key]))
                    .toList()
                : []);

  @override
  List<Object?> get props => [driver, orders, selectedOrder];
}

class StatusInService extends MainState {
  final LatLng? currentLocation;

  static List<Enum$OrderStatus> statusesWithMarker = [
    Enum$OrderStatus.DriverAccepted,
    Enum$OrderStatus.Arrived,
    Enum$OrderStatus.Started
  ];

  StatusInService(driver, {this.currentLocation})
      : super(
            driver,
            ((driver?.currentOrders.isEmpty ?? true) ||
                    !statusesWithMarker
                        .contains(driver.currentOrders.first.status)
                ? []
                : ((driver?.currentOrders.first.status ==
                            Enum$OrderStatus.DriverAccepted ||
                        driver?.currentOrders.first.status ==
                            Enum$OrderStatus.Arrived)
                    ? [
                        MarkerData(
                            id: driver!.currentOrders.first.points[0].lat
                                .toString(),
                            position: LatLng(
                                driver?.currentOrders.first.points[0].lat,
                                driver?.currentOrders.first.points[0].lng),
                            address: driver?.currentOrders.first.addresses[0])
                      ]
                    : [
                        MarkerData(
                            id: driver!
                                .currentOrders
                                .first
                                .points[driver!.currentOrders.first
                                        .destinationArrivedTo +
                                    1]
                                .lat
                                .toString(),
                            position: LatLng(
                                driver
                                    ?.currentOrders
                                    .first
                                    .points[driver!.currentOrders.first
                                            .destinationArrivedTo +
                                        1]
                                    .lat,
                                driver
                                    ?.currentOrders
                                    .first
                                    .points[driver!.currentOrders.first
                                            .destinationArrivedTo +
                                        1]
                                    .lng),
                            address: driver?.currentOrders.first.addresses[
                                driver!.currentOrders.first
                                        .destinationArrivedTo +
                                    1])
                      ])));

  @override
  List<Object?> get props => [
        driver?.currentOrders.firstOrNull?.status,
        driver?.currentOrders.firstOrNull?.destinationArrivedTo,
        markers.map((e) => e.address).join(','),
        currentLocation
      ];
}

class MainBloc extends Bloc<MainEvent, MainState> {
  /// Nombre d'événements de souscription (offre créée / retirée) reçus.
  /// Une relecture complète (p1-resync) le note au départ de la requête : s'il
  /// a bougé à l'arrivée de la réponse, l'instantané serveur peut être plus
  /// ancien que ces événements (il ferait disparaître une offre tout juste
  /// reçue, ou réapparaître une offre tout juste prise) ; il est alors écarté
  /// et la relecture est rejouée.
  int get subscriptionRevision => _subscriptionRevision;
  int _subscriptionRevision = 0;

  @override
  void onEvent(MainEvent event) {
    // `onEvent` est appelé de façon synchrone dans `add`, avant le traitement.
    if (event is AvailabledOrderAdded || event is AvailableOrderRemoved) {
      _subscriptionRevision++;
    }
    super.onEvent(event);
  }

  MainBloc() : super(StatusOffline(null)) {
    on<VersionStatusEvent>(((event, emit) => emit(RequireUpdateState())));

    on<DriverUpdated>((event, emit) {
      switch (event.driver.status) {
        case Enum$DriverStatus.Online:
          // Un Kasiman déjà en ligne garde ses offres : `DriverUpdated` arrive
          // aussi à chaque relecture du profil (`Me`), notamment au retour de
          // l'app au premier plan. Repartir d'une liste vide effaçait alors le
          // carrousel sans que rien ne le recharge (p1-resync). La liste est
          // ensuite corrigée par la relecture des offres.
          final current = state;
          emit(current is StatusOnline
              ? StatusOnline(
                  driver: event.driver,
                  orders: current.orders,
                  selectedOrder: current.selectedOrder)
              : StatusOnline(driver: event.driver, orders: const []));
          break;

        case Enum$DriverStatus.InService:
          emit(StatusInService(event.driver));
          break;

        case Enum$DriverStatus.Offline:
          emit(StatusOffline(event.driver));
          break;

        case Enum$DriverStatus.Blocked:
        case Enum$DriverStatus.WaitingDocuments:
        case Enum$DriverStatus.PendingApproval:
        case Enum$DriverStatus.SoftReject:
        case Enum$DriverStatus.HardReject:
        case Enum$DriverStatus.$unknown:
          emit(StatusUnregistered(event.driver));
      }
    });

    on<AvailableOrdersUpdated>((event, emit) {
      if (state is! StatusOnline) {
        return;
      }
      final current = state as StatusOnline;
      final List<Fragment$AvailableOrder> orders = event.orders;
      // Comparaison réelle des ENSEMBLES d'IDs. L'ancienne détection par somme
      // des IDs laissait passer les échanges où les sommes coïncident
      // (ex. {2,5} -> {3,4}), donnant une liste de courses périmée au chauffeur.
      final oldIds = current.orders.map((e) => e.id).toSet();
      final newIds = orders.map((e) => e.id).toSet();
      if (const SetEquality<String>().equals(oldIds, newIds)) {
        return;
      }
      if (event.notifyNew && newIds.difference(oldIds).isNotEmpty) {
        FlutterRingtonePlayer().play(
            fromAsset: "images/notification.mp3",
            looping: false,
            volume: 1.0,
            asAlarm: true);
      }
      // Conserve la course sélectionnée si elle est toujours proposée, sinon
      // retombe sur la première.
      final selectedOrder = current.selectedOrder != null &&
              newIds.contains(current.selectedOrder!.id)
          ? orders.firstWhere((e) => e.id == current.selectedOrder!.id)
          : (orders.isNotEmpty ? orders.first : null);
      emit(StatusOnline(
          driver: current.driver,
          orders: orders,
          selectedOrder: selectedOrder));
    });

    on<AvailabledOrderAdded>((event, emit) {
      if (state is StatusOnline &&
          (state as StatusOnline).orders.firstWhereOrNull(
                  (element) => element.id == event.order.id) ==
              null) {
        FlutterRingtonePlayer().play(
            fromAsset: "images/notification.mp3",
            looping: false,
            volume: 1.0,
            asAlarm: true);
        //(state as StatusOnline).orders.add(event.order);
        final newOrders =
            (state as StatusOnline).orders.followedBy([event.order]).toList();
        emit(StatusOnline(
            driver: state.driver,
            orders: newOrders,
            selectedOrder: (state as StatusOnline).orders.isEmpty
                ? event.order
                : (state as StatusOnline).selectedOrder));
      }
    });

    on<AvailableOrderRemoved>((event, emit) {
      if (state is StatusOnline &&
          (state as StatusOnline).orders.firstWhereOrNull(
                  (element) => element.id == event.order.id) !=
              null) {
        final current = state as StatusOnline;
        // Nouvelle liste (et non `removeWhere` en place) : muter la liste de
        // l'état existant conserve la même référence et peut faire manquer des
        // rebuilds côté BLoC.
        final newOrders =
            current.orders.where((e) => e.id != event.order.id).toList();
        emit(StatusOnline(
            driver: current.driver,
            orders: newOrders,
            selectedOrder: current.selectedOrder?.id == event.order.id
                ? newOrders.firstOrNull
                : current.selectedOrder));
      }
    });

    on<SelectedOrderChanged>((event, emit) {
      if (state is StatusOnline) {
        emit(StatusOnline(
            driver: state.driver,
            orders: (state as StatusOnline).orders,
            selectedOrder: (state as StatusOnline).orders[event.index]));
      }
    });

    on<CurrentOrderUpdated>((event, emit) {
      final endedStatuses = [
        Enum$OrderStatus.RiderCanceled,
        Enum$OrderStatus.DriverCanceled,
        Enum$OrderStatus.Finished,
        Enum$OrderStatus.WaitingForReview
      ];
      final order = event.order;
      if (endedStatuses.contains(order.status)) {
        // TODO: Verify commenting out these lines didn't caused malfunction, if so, remove them
        // state.driver!.status = Enum$DriverStatus.Online;
        // state.driver!.currentOrders = [];
        emit(StatusOnline(driver: state.driver, orders: const []));
      } else {
        if (state.driver?.currentOrders.isNotEmpty ?? false) {
          state.driver?.currentOrders.removeAt(0);
        }
        state.driver?.currentOrders
            .add(Query$Me$driver$currentOrders.fromJson(order.toJson()));

        emit(StatusInService(state.driver));
      }
    });
  }
}

class MarkerData {
  String id;
  LatLng position;
  String address;

  MarkerData({required this.id, required this.position, required this.address});
}
