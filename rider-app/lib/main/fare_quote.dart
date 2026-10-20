// p2-argent I4 (2026-10-20) : devis figé côté client.
//
// getFare renvoie, pour chaque service, un devis (`quoteId`) valable environ
// 2 minutes (`quoteExpiresAt`). createOrder consomme ce devis : le prix
// enregistré est celui affiché. Ce fichier regroupe ce que l'écran de choix du
// service partage : formatage du prix, lecture des codes de refus, relance de
// getFare et confirmation d'un prix qui a changé.
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/main/bloc/main_bloc.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/schema.gql.dart';

/// Codes de refus du devis (rider-api, `extensions.code`).
class FareQuoteErrorCode {
  static const expired = 'QUOTE_EXPIRED';
  static const mismatch = 'QUOTE_MISMATCH';
  static const alreadyUsed = 'QUOTE_ALREADY_USED';
  static const routeUnavailable = 'ROUTE_UNAVAILABLE';
}

/// Prix en franc entier. XOF/XAF : « 2 500 FCFA » ; autre devise : symbole
/// de la devise, sans décimale.
String formatFare(num amount, String currency) {
  final rounded = amount.round();
  final code = currency.toUpperCase();
  if (code == 'XOF' || code == 'XAF') {
    return '${NumberFormat.decimalPattern('fr').format(rounded)} FCFA';
  }
  return NumberFormat.simpleCurrency(name: currency, decimalDigits: 0)
      .format(rounded);
}

/// Prix que voit le client : après coupon s'il y en a un.
num displayedFare(Query$GetFare$getFare$services$services service) =>
    service.costAfterCoupon ?? service.cost;

/// Code stable d'une erreur GraphQL (`extensions.code`), sinon null.
String? graphqlErrorCode(OperationException? exception) {
  for (final error in exception?.graphqlErrors ?? const <GraphQLError>[]) {
    final code = error.extensions?['code'];
    if (code is String && code.isNotEmpty) return code;
  }
  return null;
}

Query$GetFare$getFare$services$services? findFareService(
    Query$GetFare$getFare fare, String serviceId) {
  for (final category in fare.services) {
    for (final service in category.services) {
      if (service.id == serviceId) return service;
    }
  }
  return null;
}

/// Relance getFare pour l'aperçu en cours, sans passer par l'affichage.
/// `intervalMinutes` : réservation chiffrée à l'heure prévue.
Future<QueryResult<Query$GetFare>> fetchFare(
    GraphQLClient client, OrderPreview state,
    {int? intervalMinutes}) {
  return client.query$GetFare(Options$Query$GetFare(
      fetchPolicy: FetchPolicy.noCache,
      variables: Variables$Query$GetFare(
          points: state.points
              .map((e) => Input$PointInput(
                  lat: e.latlng.latitude, lng: e.latlng.longitude))
              .toList(),
          selectedOptionIds: state.selectedOptions,
          couponCode: state.couponCode,
          intervalMinutes: intervalMinutes)));
}

/// Délai avant l'expiration d'un devis, mesuré à partir de sa réception.
/// L'horloge du téléphone peut différer de celle du serveur : on borne la
/// durée lue pour ne jamais garder un devis trop longtemps.
Duration quoteLifetime(DateTime? expiresAt) {
  if (expiresAt == null) return Duration.zero;
  final left = expiresAt.difference(DateTime.now());
  if (left < const Duration(seconds: 15)) return const Duration(seconds: 15);
  if (left > const Duration(minutes: 5)) return const Duration(minutes: 5);
  return left;
}

/// Demande au client de confirmer un prix qui a changé. Renvoie true s'il
/// accepte le nouveau prix.
Future<bool> confirmFareChange(BuildContext context,
    {required num oldPrice,
    required num newPrice,
    required String currency}) async {
  final accepted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
            title: Text(S.of(context).fare_price_changed_title),
            content: Text(S.of(context).fare_price_changed_message(
                formatFare(oldPrice, currency),
                formatFare(newPrice, currency))),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text(S.of(context).action_cancel)),
              TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text(S.of(context).action_confirm)),
            ],
          ));
  return accepted ?? false;
}

/// Itinéraire indisponible : message lisible et bouton « Réessayer ».
/// Renvoie true si le client veut réessayer.
Future<bool> showRouteUnavailable(BuildContext context) async {
  final retry = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
            content: Text(S.of(context).fare_route_unavailable),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text(S.of(context).action_cancel)),
              TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text(S.of(context).action_retry)),
            ],
          ));
  return retry ?? false;
}
