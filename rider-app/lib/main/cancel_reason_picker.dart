import 'package:client_shared/components/cancel_reason_sheet.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/l10n/messages.dart';

/// p3-mesures M4 : feuille « Pourquoi annulez-vous ? » avant une annulation.
/// Les motifs sont lus au serveur à chaque ouverture (`cancelReasons`).
/// Rend `null` si l'utilisateur renonce ; sinon le motif choisi, ou un motif
/// vide si la liste n'a pas pu être lue (l'annulation part alors sans motif).
Future<CancelReasonChoice?> pickCancelReason(BuildContext context,
    {String? warning}) {
  final client = GraphQLProvider.of(context).value;
  final s = S.of(context);
  return showCancelReasonSheet(
    context: context,
    warning: warning,
    labels: CancelReasonSheetLabels(
      title: s.cancel_reason_title,
      confirm: s.cancel_reason_confirm,
      back: s.cancel_reason_back,
      unavailable: s.cancel_reason_unavailable,
    ),
    loadReasons: () async {
      final result = await client.query$CancelReasons(
          Options$Query$CancelReasons(fetchPolicy: FetchPolicy.networkOnly));
      final data = result.parsedData;
      if (result.hasException || data == null) {
        throw result.exception ?? StateError('cancelReasons sans données');
      }
      return data.cancelReasons
          .map((reason) =>
              CancelReasonOption(id: reason.id, title: reason.title))
          .toList();
    },
  );
}
