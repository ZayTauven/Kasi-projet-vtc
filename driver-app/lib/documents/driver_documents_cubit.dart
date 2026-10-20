import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'package:kasi_driver/main_bloc.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'driver_documents.graphql.dart';

typedef DriverDocumentType = Fragment$DriverDocumentTypeItem;
typedef DriverDocument = Fragment$DriverDocumentItem;

/// Fenetre du bandeau "expire bientot" : le premier rappel du backend part
/// a J-30 (`driver_document_type.reminderDays`, non expose a l'app).
const int kDocumentExpirySoonDays = 30;

/// Etat affiche pour un type de document (p2-kyc K3).
enum DocumentDisplayStatus {
  missing,
  pending,
  approved,
  rejected,
  expiringSoon,
  expired,
}

/// Jour courant a Dakar (UTC), au format des echeances (`YYYY-MM-DD`).
DateTime dakarToday() {
  final now = DateTime.now().toUtc();
  return DateTime.utc(now.year, now.month, now.day);
}

DateTime? parseExpiry(String? value) {
  if (value == null || value.isEmpty) return null;
  final parts = value.split('-');
  if (parts.length != 3) return null;
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  final d = int.tryParse(parts[2]);
  if (y == null || m == null || d == null) return null;
  return DateTime.utc(y, m, d);
}

/// Un type du catalogue et l'etat du Kasiman pour ce type.
class DocumentSlot {
  final DriverDocumentType type;

  /// Document valide courant (le plus recent).
  final DriverDocument? approved;

  /// Envoi en attente de revue.
  final DriverDocument? pending;

  /// Dernier refus, s'il est plus recent que tout envoi en attente ou valide.
  final DriverDocument? rejected;

  /// Dernier document expire.
  final DriverDocument? expired;

  final DocumentDisplayStatus status;

  /// Jours restants avant l'echeance du document valide (0 = dernier jour).
  final int? daysLeft;

  const DocumentSlot({
    required this.type,
    required this.status,
    this.approved,
    this.pending,
    this.rejected,
    this.expired,
    this.daysLeft,
  });

  /// Le document que l'ecran montre en premier.
  DriverDocument? get shown => pending ?? rejected ?? approved ?? expired;

  factory DocumentSlot.build(
      DriverDocumentType type, List<DriverDocument> docs, DateTime today) {
    // `driverDocuments` est trie du plus recent au plus ancien par type.
    DriverDocument? first(Enum$DriverDocumentStatus s) {
      for (final d in docs) {
        if (d.status == s) return d;
      }
      return null;
    }

    final pending = first(Enum$DriverDocumentStatus.Pending);
    var approved = first(Enum$DriverDocumentStatus.Approved);
    var expired = first(Enum$DriverDocumentStatus.Expired);
    final rejectedDoc = first(Enum$DriverDocumentStatus.Rejected);

    int? daysLeft;
    final expiry = parseExpiry(approved?.expiresAt);
    if (expiry != null) {
      daysLeft = expiry.difference(today).inDays;
      // Le controle horaire du backend peut ne pas etre encore passe :
      // une echeance depassee vaut expiration.
      if (daysLeft < 0) {
        expired = approved;
        approved = null;
        daysLeft = null;
      }
    }

    DateTime? newestKept;
    for (final d in [pending, approved]) {
      if (d != null && (newestKept == null || d.createdAt.isAfter(newestKept))) {
        newestKept = d.createdAt;
      }
    }
    final rejected = rejectedDoc != null &&
            (newestKept == null || rejectedDoc.createdAt.isAfter(newestKept))
        ? rejectedDoc
        : null;

    final DocumentDisplayStatus status;
    if (pending != null) {
      status = DocumentDisplayStatus.pending;
    } else if (rejected != null) {
      status = DocumentDisplayStatus.rejected;
    } else if (approved != null) {
      status = daysLeft != null && daysLeft <= kDocumentExpirySoonDays
          ? DocumentDisplayStatus.expiringSoon
          : DocumentDisplayStatus.approved;
    } else if (expired != null) {
      status = DocumentDisplayStatus.expired;
    } else {
      status = DocumentDisplayStatus.missing;
    }
    return DocumentSlot(
      type: type,
      status: status,
      approved: approved,
      pending: pending,
      rejected: rejected,
      expired: expired,
      daysLeft: daysLeft,
    );
  }
}

class DriverDocumentsState {
  final List<DocumentSlot> slots;
  final bool loaded;
  final bool loading;
  final OperationException? error;

  const DriverDocumentsState({
    this.slots = const [],
    this.loaded = false,
    this.loading = false,
    this.error,
  });

  /// Documents valides qui arrivent a echeance sans renouvellement envoye.
  List<DocumentSlot> get expiringSoon => slots
      .where((s) => s.status == DocumentDisplayStatus.expiringSoon)
      .toList();

  /// Documents obligatoires expires sans document valide : ils suspendent le
  /// Kasiman (fiche KYC 3.4), meme si un renouvellement est en attente (Q5).
  List<DocumentSlot> get blocking => slots
      .where((s) =>
          s.type.isRequired && s.approved == null && s.expired != null)
      .toList();

  /// Documents expires (obligatoires ou non) sans document valide.
  List<DocumentSlot> get expired =>
      slots.where((s) => s.approved == null && s.expired != null).toList();
}

/// Documents types du Kasiman, partages par l'accueil (bandeau), l'ecran de
/// suspension et "Mes documents". Relectures silencieuses : une erreur reseau
/// garde le dernier etat connu.
class DriverDocumentsCubit extends Cubit<DriverDocumentsState> {
  DriverDocumentsCubit() : super(const DriverDocumentsState());

  bool _inFlight = false;

  Future<void> refresh(GraphQLClient client) async {
    if (_inFlight || isClosed) return;
    _inFlight = true;
    emit(DriverDocumentsState(
        slots: state.slots, loaded: state.loaded, loading: true));
    try {
      final result = await client.query$MyDriverDocuments(
          Options$Query$MyDriverDocuments(
              fetchPolicy: FetchPolicy.noCache));
      if (isClosed) return;
      final data = result.parsedData;
      if (result.hasException || data == null) {
        debugPrint('[DOCUMENTS] relecture sans donnees : ${result.exception}');
        emit(DriverDocumentsState(
            slots: state.slots,
            loaded: state.loaded,
            error: result.exception));
        return;
      }
      final today = dakarToday();
      final slots = data.driverDocumentTypes
          .map((t) => DocumentSlot.build(
              t,
              data.driverDocuments.where((d) => d.typeId == t.id).toList(),
              today))
          .toList();
      emit(DriverDocumentsState(slots: slots, loaded: true));
    } catch (e) {
      // Erreur hors GraphQL (lecture de la reponse) : visible a l'ecran et
      // dans les journaux, plutot qu'un ecran vide.
      debugPrint('[DOCUMENTS] relecture en echec : $e');
      if (!isClosed) {
        emit(DriverDocumentsState(
            slots: state.slots,
            loaded: state.loaded,
            error: OperationException(linkException: UnknownException(e, StackTrace.current))));
      }
    } finally {
      _inFlight = false;
    }
  }
}

/// Relit les documents a l'affichage de l'accueil, au retour au premier plan
/// et a chaque changement d'etat du Kasiman (une suspension le passe en
/// "soft reject", une validation le remet hors ligne).
class DriverDocumentsWatcher extends StatefulWidget {
  final Widget child;

  const DriverDocumentsWatcher({Key? key, required this.child})
      : super(key: key);

  @override
  State<DriverDocumentsWatcher> createState() => _DriverDocumentsWatcherState();
}

class _DriverDocumentsWatcherState extends State<DriverDocumentsWatcher>
    with WidgetsBindingObserver {
  StreamSubscription<MainState>? _mainSub;
  List<Object?>? _lastKey;

  List<Object?> _keyOf(MainState s) => [s.runtimeType, s.driver?.status];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final mainBloc = context.read<MainBloc>();
    _lastKey = _keyOf(mainBloc.state);
    _mainSub = mainBloc.stream.listen((next) {
      final key = _keyOf(next);
      if (key[0] != _lastKey?[0] || key[1] != _lastKey?[1]) {
        _lastKey = key;
        _refresh();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  void _refresh() {
    if (!mounted) return;
    context
        .read<DriverDocumentsCubit>()
        .refresh(GraphQLProvider.of(context).value);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _mainSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
