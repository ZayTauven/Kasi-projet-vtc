import 'dart:async';

import 'package:client_shared/components/kasi_banner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/main/bloc/jwt_cubit.dart';
import 'package:kasi_rider/main/bloc/last_orders_cubit.dart';
import 'package:kasi_rider/main/bloc/main_bloc.dart';
import 'package:kasi_rider/main/bloc/rider_profile_cubit.dart';
import 'package:kasi_rider/main/graphql_provider.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/main/request_timeout_link.dart';
import 'package:kasi_rider/query_result_view.dart';
import 'package:kasi_rider/schema.gql.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Échec d'une action sur la course (commander, annuler, noter...) : message
/// bref, puis relecture de la course au serveur au lieu d'un rejeu à
/// l'aveugle (bug-timeout, bug-rafraichissement). Après un délai dépassé,
/// l'action a pu aboutir côté serveur : l'écran se recale sur l'état réel.
void handleOrderActionError(
    BuildContext context, OperationException? exception) {
  final timeout = isRequestTimeout(exception);
  // La relecture d'abord : elle ne doit jamais dépendre de l'affichage du
  // message.
  CurrentOrderResyncScope.request(
      timeout ? "délai dépassé sur une action" : "échec d'une action");
  // Après 20 s, l'écran de l'action a souvent été reconstruit (course relue
  // entre-temps) : son contexte n'est plus monté, on affiche alors le message
  // depuis l'écran principal.
  final messageContext =
      context.mounted ? context : CurrentOrderResyncScope._active?.context;
  if (messageContext == null || !messageContext.mounted) return;
  if (timeout) {
    ScaffoldMessenger.of(messageContext).showSnackBar(SnackBar(
        content: KasiBanner(S.of(messageContext).message_order_action_checking,
            type: BannerType.error)));
  } else {
    showOperationErrorMessage(messageContext, exception);
  }
}

/// Relecture de la course en cours dans l'app client (bug-rafraichissement).
///
/// Un changement fait à distance (Kasiman qui annule ou arrive, course
/// expirée, fin) n'arrive que par la souscription `orderUpdated`. Si le socket
/// était coupé à ce moment-là, l'écran restait sur l'ancien état (course
/// annulée affichée avec un temps d'arrivée négatif) jusqu'au redémarrage. Ce
/// widget relit donc la course par la requête existante `GetCurrentOrder`,
/// sans rien afficher pendant la requête :
///  - au retour de l'app au premier plan ;
///  - à la reconnexion stable du WebSocket GraphQL ;
///  - après l'échec d'une action sur la course ([handleOrderActionError]) ;
///  - tant qu'une relecture échoue (réseau coupé), toutes les 5 s, ce qui
///    rattrape aussi le retour du réseau.
/// Les deux premiers déclencheurs ne jouent qu'avec une course à l'écran ;
/// l'échec d'une action relit dans tous les cas (une commande a pu être
/// créée alors que l'écran montre encore le choix du service). Rien pour un
/// invité (pas de session).
///
/// Le résultat passe par `ProfileUpdated`, comme la lecture initiale : plus
/// de course en cours côté serveur -> retour à l'accueil. Une seule requête en
/// vol ; une réponse partie avant une mise à jour de la course
/// (`CurrentOrderUpdated`) est écartée puis rejouée.
class CurrentOrderResyncScope extends StatefulWidget {
  final Widget child;

  const CurrentOrderResyncScope({Key? key, required this.child})
      : super(key: key);

  static _CurrentOrderResyncScopeState? _active;

  /// Demande une relecture, quel que soit l'état (échec d'une action).
  static void request(String reason) {
    final state = _active;
    if (state == null) {
      debugPrint('[RESYNC-COURSE] relecture demandée ($reason) : aucun écran');
      return;
    }
    state._resync(reason, force: true);
  }

  @override
  State<CurrentOrderResyncScope> createState() =>
      _CurrentOrderResyncScopeState();
}

class _CurrentOrderResyncScopeState extends State<CurrentOrderResyncScope>
    with WidgetsBindingObserver {
  static const Duration _retryAfterFailure = Duration(seconds: 5);
  // En `graphql-ws`, l'état `connected` est émis avant l'ouverture réelle du
  // socket (boucle connecting -> connected -> notConnected pendant une
  // coupure) : on attend qu'il dure pour y voir un vrai retour du réseau.
  static const Duration _socketSettle = Duration(seconds: 2);

  late final MainBloc _bloc;
  StreamSubscription<MainBlocState>? _blocSub;
  final Future<PackageInfo> _packageInfo = PackageInfo.fromPlatform();

  bool _foreground = true;
  bool _inFlight = false;
  String? _pendingReason;
  bool _pendingForce = false;
  // Relecture demandée après l'échec d'une action, pas encore aboutie.
  bool _forced = false;
  Timer? _retry;

  SocketClient? _watchedSocket;
  StreamSubscription<SocketConnectionState>? _socketSub;
  SocketConnectionState? _socketState;
  bool _socketWasLost = false;
  Timer? _socketSettleTimer;
  Timer? _socketWatch;

  @override
  void initState() {
    super.initState();
    CurrentOrderResyncScope._active = this;
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    _bloc = context.read<MainBloc>();
    // Le socket naît à la première souscription (suivi de la course) : on
    // s'y raccroche après chaque changement d'état.
    _blocSub = _bloc.stream.listen((_) => WidgetsBinding.instance
        .addPostFrameCallback((_) => _attachSocket()));
    WidgetsBinding.instance.addPostFrameCallback((_) => _attachSocket());
    // Le socket peut naître (première souscription) ou être recréé (nouveau
    // client) sans changement d'état de l'écran : sans ce contrôle, une
    // coupure au démarrage à froid passait inaperçue. Simple comparaison de
    // références, sans requête.
    _socketWatch =
        Timer.periodic(const Duration(seconds: 2), (_) => _attachSocket());
  }

  @override
  void dispose() {
    if (identical(CurrentOrderResyncScope._active, this)) {
      CurrentOrderResyncScope._active = null;
    }
    WidgetsBinding.instance.removeObserver(this);
    _blocSub?.cancel();
    _retry?.cancel();
    _socketSettleTimer?.cancel();
    _socketWatch?.cancel();
    _socketSub?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        final wasBackground = !_foreground;
        _foreground = true;
        if (wasBackground) _resync('retour au premier plan');
        break;
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        _foreground = false;
        _retry?.cancel();
        _retry = null;
        break;
      case AppLifecycleState.inactive:
        break;
    }
  }

  bool get _hasOrder => _bloc.state is StateWithActiveOrder;

  bool get _loggedIn {
    final jwt = context.read<JWTCubit>().state;
    return jwt != null && jwt.isNotEmpty;
  }

  void _attachSocket() {
    if (!mounted) return;
    final socket = activeWebSocketLink?.getSocketClient;
    if (identical(socket, _watchedSocket)) return;
    _socketSub?.cancel();
    _socketSettleTimer?.cancel();
    _watchedSocket = socket;
    _socketState = null;
    _socketWasLost = false;
    _socketSub = socket?.connectionState.listen(_onSocketState);
  }

  void _onSocketState(SocketConnectionState state) {
    _socketState = state;
    if (state == SocketConnectionState.notConnected) {
      if (!_socketWasLost) _log('WebSocket déconnecté');
      _socketWasLost = true;
      _socketSettleTimer?.cancel();
      return;
    }
    if (state == SocketConnectionState.connected && _socketWasLost) {
      _socketSettleTimer?.cancel();
      _socketSettleTimer = Timer(_socketSettle, () {
        if (!mounted || _socketState != SocketConnectionState.connected) {
          return;
        }
        _socketWasLost = false;
        _log('WebSocket reconnecté');
        _resync('reconnexion WebSocket');
      });
    }
  }

  void _resync(String reason, {bool force = false}) {
    if (!mounted) return;
    _attachSocket();
    if (!_loggedIn) {
      _forced = false;
      return;
    }
    if (force) _forced = true;
    if (!_foreground) {
      // Rejouée au retour au premier plan, qui relit de toute façon.
      _log('relecture différée ($reason) : arrière-plan');
      return;
    }
    if (!_forced && !_hasOrder) {
      _log('relecture ignorée ($reason) : pas de course à l’écran');
      return;
    }
    if (_inFlight) {
      _pendingReason ??= reason;
      _pendingForce = _pendingForce || force;
      return;
    }
    _run(reason);
  }

  Future<void> _run(String reason) async {
    _inFlight = true;
    _retry?.cancel();
    _retry = null;
    final revision = _bloc.orderRevision;
    final before = _describe(_bloc.state);
    final stopwatch = Stopwatch()..start();
    try {
      final client = GraphQLProvider.of(context).value;
      final info = await _packageInfo;
      final result = await client.query$GetCurrentOrder(
          Options$Query$GetCurrentOrder(
              fetchPolicy: FetchPolicy.noCache,
              variables: Variables$Query$GetCurrentOrder(
                  versionCode: int.tryParse(info.buildNumber) ?? 99999)));
      if (!mounted) return;
      final ms = stopwatch.elapsedMilliseconds;
      final data = result.parsedData;
      if (result.hasException || data == null) {
        _onFailure(reason, ms, result.exception?.toString());
        return;
      }
      if (_bloc.orderRevision != revision) {
        _log('relecture écartée ($reason) : course mise à jour pendant la '
            'requête, rejeu');
        _pendingReason ??= 'rejeu après mise à jour concurrente';
        return;
      }
      _forced = false;
      // Même traitement que la lecture initiale (`GetCurrentOrder` de
      // `LocationSelectionParentView`).
      context.read<RiderProfileCubit>().updateProfile(data.rider);
      context.read<LastOrdersCubit>().setLastOrders(data.rider.lastOrders);
      if (data.requireUpdate == Enum$VersionStatus.MandatoryUpdate) {
        _bloc.add(VersionStatusEvent(data.requireUpdate));
        return;
      }
      final orders = data.rider.orders;
      final server = orders.isEmpty
          ? 'aucune course en cours'
          : 'course ${orders.first.id} ${orders.first.status.name}';
      _log('relecture OK ($reason) en $ms ms : écran $before, serveur $server');
      _bloc.add(ProfileUpdated(
          profile: data.rider,
          driverLocation: data.getCurrentOrderDriverLocation));
    } catch (e) {
      if (!mounted) return;
      _onFailure(reason, stopwatch.elapsedMilliseconds, e.toString());
    } finally {
      _inFlight = false;
      final pending = _pendingReason;
      final pendingForce = _pendingForce;
      _pendingReason = null;
      _pendingForce = false;
      if (pending != null && mounted) _resync(pending, force: pendingForce);
    }
  }

  void _onFailure(String reason, int ms, String? error) {
    final firstLine = (error ?? 'réponse vide').split('\n').first;
    final short = firstLine.length > 160
        ? '${firstLine.substring(0, 160)}...'
        : firstLine;
    _log('relecture en échec ($reason) après $ms ms : $short');
    // Tant que le serveur ne répond pas, on retente : l'écran se recale dès
    // le retour du réseau.
    if (_foreground && (_forced || _hasOrder)) {
      _retry?.cancel();
      _retry = Timer(_retryAfterFailure, () {
        _retry = null;
        _resync('nouvel essai après échec');
      });
    }
  }

  String _describe(MainBlocState state) {
    if (state is StateWithActiveOrder) {
      return 'course ${state.currentOrder.id} '
          '${state.currentOrder.status.name}';
    }
    return state.runtimeType.toString();
  }

  void _log(String message) => debugPrint('[RESYNC-COURSE] $message');

  @override
  Widget build(BuildContext context) => widget.child;
}
