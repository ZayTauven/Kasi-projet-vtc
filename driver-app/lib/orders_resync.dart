import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:kasi_driver/graphql/order.fragment.graphql.dart';
import 'package:kasi_driver/main.graphql.dart';

import 'graphql_provider.dart';
import 'main_bloc.dart';

/// Resynchronisation des offres dans l'app Kasiman (p1-resync, bug-offre-perdue).
///
/// Le serveur ne diffuse une offre qu'une fois, à sa création (souscription
/// `orderCreated`). Si la connexion est coupée à ce moment-là, ou si l'app est
/// en arrière-plan, l'offre est manquée ; elle reste pourtant en attente côté
/// serveur (Redis GEO) et `availableOrders` la renvoie. Ce widget relit donc la
/// liste complète :
///  - au retour du réseau : reconnexion stable du WebSocket GraphQL, ou
///    première requête réussie après un échec (nouvel essai toutes les 5 s
///    tant que ça échoue) ;
///  - au retour de l'app au premier plan ;
///  - toutes les 15 s tant que le Kasiman est en ligne, sans course, et que
///    l'app est au premier plan. Le minuteur s'arrête dans tous les autres cas.
///
/// La relecture est silencieuse (aucun écran de chargement ni d'erreur) et il
/// n'y a jamais plus d'une requête en vol : un déclenchement pendant une
/// requête est mémorisé et rejoué une fois à son retour. La liste reçue
/// remplace celle du carrousel : une offre expirée ou prise disparaît.
///
/// Monté au-dessus de `Query$Me$Widget` : la relecture du profil (qui démonte
/// tout l'écran le temps du chargement) ne l'interrompt pas.
class OrdersResyncScope extends StatefulWidget {
  final Widget child;

  const OrdersResyncScope({Key? key, required this.child}) : super(key: key);

  @override
  State<OrdersResyncScope> createState() => _OrdersResyncScopeState();
}

class _OrdersResyncScopeState extends State<OrdersResyncScope>
    with WidgetsBindingObserver {
  static const Duration _period = Duration(seconds: 15);
  static const Duration _retryAfterFailure = Duration(seconds: 5);
  // En protocole `graphql-ws`, le client émet `connected` dès la création du
  // canal, avant de savoir si le socket s'ouvre : pendant une coupure, l'état
  // boucle connecting -> connected -> notConnected toutes les 5 s. On ne tient
  // la reconnexion pour un retour du réseau que si `connected` dure ce délai.
  static const Duration _socketSettle = Duration(seconds: 2);

  late final MainBloc _bloc;
  StreamSubscription<MainState>? _blocSub;

  Timer? _periodic;
  Timer? _retry;
  bool _foreground = true;
  bool _inFlight = false;
  String? _pendingReason;
  bool _lastFailed = false;
  String? _stoppedBecause;

  SocketClient? _watchedSocket;
  StreamSubscription<SocketConnectionState>? _socketSub;
  SocketConnectionState? _socketState;
  bool _socketWasLost = false;
  Timer? _socketSettleTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    _bloc = context.read<MainBloc>();
    _blocSub = _bloc.stream.listen((_) => _refreshTimer());
    // Après la première frame : le GraphQLProvider et le socket (créé par la
    // première souscription) sont alors disponibles.
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshTimer());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _blocSub?.cancel();
    _periodic?.cancel();
    _retry?.cancel();
    _socketSettleTimer?.cancel();
    _socketSub?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        final wasBackground = !_foreground;
        _foreground = true;
        // Si le minuteur redémarre, `_refreshTimer` relit déjà : pas de
        // double relecture.
        final restarted = _refreshTimer();
        if (wasBackground && !restarted) _resync('retour au premier plan');
        break;
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        _foreground = false;
        _refreshTimer();
        break;
      case AppLifecycleState.inactive:
        // Encore visible (volet de notifications, appel entrant) : on continue.
        break;
    }
  }

  String? _ineligibleReason() {
    if (!_foreground) return 'arrière-plan';
    final state = _bloc.state;
    if (state is StatusInService) return 'en course';
    if (state is! StatusOnline) return 'hors ligne';
    if (state.driver?.currentOrders.isNotEmpty ?? false) return 'en course';
    return null;
  }

  /// Démarre ou arrête le minuteur selon l'état courant. Au passage à l'état
  /// éligible (en ligne, sans course, premier plan), relit immédiatement.
  /// Renvoie `true` si le minuteur vient de démarrer.
  bool _refreshTimer() {
    if (!mounted) return false;
    final reason = _ineligibleReason();
    if (reason == null) {
      if (_periodic != null) return false;
      final trigger = _stoppedBecause == 'arrière-plan'
          ? 'retour au premier plan'
          : _stoppedBecause == 'en course'
              ? 'fin de course'
              : 'passage en ligne';
      _log('minuteur démarré (15 s)');
      _stoppedBecause = null;
      _periodic = Timer.periodic(_period, (_) => _resync('minuteur 15 s'));
      _resync(trigger);
      return true;
    }
    if (_periodic != null) {
      _log('minuteur arrêté ($reason)');
    } else if (_stoppedBecause != reason) {
      _log('minuteur inactif ($reason)');
    }
    _periodic?.cancel();
    _periodic = null;
    _retry?.cancel();
    _retry = null;
    _stoppedBecause = reason;
    return false;
  }

  /// Observe le socket du client GraphQL courant. Il peut être créé après ce
  /// widget (à la première souscription) ou recréé (nouvelle session) : on se
  /// réabonne dès qu'il change.
  void _attachSocket() {
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

  void _resync(String reason) {
    if (!mounted) return;
    _attachSocket();
    final ineligible = _ineligibleReason();
    if (ineligible != null) {
      _log('relecture ignorée ($reason) : $ineligible');
      return;
    }
    if (_inFlight) {
      // Jamais deux requêtes concurrentes : on rejouera une fois au retour.
      _pendingReason ??= reason;
      return;
    }
    _run(reason);
  }

  Future<void> _run(String reason) async {
    _inFlight = true;
    _retry?.cancel();
    _retry = null;
    final revision = _bloc.subscriptionRevision;
    final stopwatch = Stopwatch()..start();
    try {
      final client = GraphQLProvider.of(context).value;
      // Aucun délai supplémentaire ici : celui du client (20 s) borne la
      // requête, et `_inFlight` reste levé jusqu'à son vrai retour pour ne
      // jamais empiler de requêtes.
      final result = await _guardedQuery(client);
      if (!mounted) return;
      final ms = stopwatch.elapsedMilliseconds;
      final data = result.parsedData;
      if (result.hasException || data == null) {
        _onFailure(reason, ms, result.exception?.toString());
        return;
      }
      if (_lastFailed) {
        _log('réseau rétabli (requête réussie après échec)');
        _lastFailed = false;
      }
      if (_bloc.subscriptionRevision != revision) {
        _log('relecture écartée ($reason) : offre créée ou retirée pendant '
            'la requête, rejeu');
        _pendingReason ??= 'rejeu après événement concurrent';
        return;
      }
      final orders = List<Fragment$AvailableOrder>.from(data.availableOrders);
      _log('relecture OK ($reason) en $ms ms : ${orders.length} offre(s) '
          '${orders.map((e) => e.id).toList()}');
      _bloc.add(AvailableOrdersUpdated(orders, notifyNew: true));
    } catch (e) {
      if (!mounted) return;
      _onFailure(reason, stopwatch.elapsedMilliseconds, e.toString());
    } finally {
      _inFlight = false;
      final pending = _pendingReason;
      _pendingReason = null;
      if (pending != null && mounted) _resync(pending);
    }
  }

  /// Lance la requête dans une zone gardée. Quand la réponse arrive après le
  /// délai de 20 s du client, `graphql` 5.2.4 rappelle `complete` sur un
  /// Completer déjà résolu par le `TimeoutException`
  /// (`query_manager.dart`, `responseStream.listen(completer.complete, ...)`)
  /// et lève « Bad state: Future already completed » hors de tout appelant
  /// (bug-timeout). Cette erreur tardive naît dans la zone de la requête : on
  /// l'y absorbe pour que la relecture reste silencieuse. Les autres requêtes
  /// de l'app ne sont pas concernées par ce garde.
  Future<QueryResult<Query$AvailableOrders>> _guardedQuery(
      GraphQLClient client) {
    final completer = Completer<QueryResult<Query$AvailableOrders>>();
    runZonedGuarded(() async {
      final result = await client.query(
          Options$Query$AvailableOrders(fetchPolicy: FetchPolicy.noCache));
      if (!completer.isCompleted) completer.complete(result);
    }, (error, stack) {
      if (error is StateError &&
          error.message.contains('Future already completed')) {
        _log('réponse tardive ignorée (arrivée après le délai de 20 s)');
        return;
      }
      if (!completer.isCompleted) {
        completer.completeError(error, stack);
      } else {
        _log('erreur tardive ignorée : $error');
      }
    });
    return completer.future;
  }

  void _onFailure(String reason, int ms, String? error) {
    _lastFailed = true;
    final firstLine = (error ?? 'réponse vide').split('\n').first;
    final short = firstLine.length > 160
        ? '${firstLine.substring(0, 160)}...'
        : firstLine;
    _log('relecture en échec ($reason) après $ms ms : $short');
    // Tant que le serveur ne répond pas, on retente plus souvent que le
    // minuteur pour afficher l'offre dès le retour du réseau.
    if (_ineligibleReason() == null) {
      _retry?.cancel();
      _retry = Timer(_retryAfterFailure, () {
        _retry = null;
        _resync('nouvel essai après échec');
      });
    }
  }

  void _log(String message) => debugPrint('[RESYNC] $message');

  @override
  Widget build(BuildContext context) => widget.child;
}
