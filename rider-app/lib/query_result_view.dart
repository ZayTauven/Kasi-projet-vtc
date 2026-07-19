import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';

import 'package:kasi_rider/l10n/messages.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class QueryResultView extends StatelessWidget {
  final QueryResult queryResult;
  final Function()? refetch;

  const QueryResultView(this.queryResult, {Key? key, required this.refetch})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (queryResult.isLoading) {
      return Center(
          child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CupertinoActivityIndicator(),
          const SizedBox(height: 8),
          Text(
            S.of(context).loading,
            style: Theme.of(context).textTheme.bodySmall,
          )
        ],
      ));
    }
    if (queryResult.hasException) {
      final isNetworkError = queryResult.exception
              .toString()
              .contains("Connection closed") ||
          queryResult.exception.toString().contains("Connection reset") ||
          queryResult.exception.toString().contains("Connection refused") ||
          queryResult.exception.toString().contains("Connection timed out") ||
          queryResult.exception.toString().contains("Connection terminated") ||
          queryResult.exception.toString().contains("Connection failed");
      // Erreur réseau OU erreur backend : toujours un message lisible + un
      // bouton « Réessayer » quand un refetch est possible. L'ancien rendu de
      // la branche générique (exception.toString() brut, sans action) laissait
      // l'utilisateur face à du texte technique sans issue.
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isNetworkError ? Ionicons.cloud_offline : Ionicons.alert_circle,
                color: CustomTheme.neutralColors.shade700,
                size: 36,
              ),
              const SizedBox(height: 12),
              Text(
                isNetworkError
                    ? S.of(context).message_error_network
                    : getErrorMessage(context, queryResult.exception),
                textAlign: TextAlign.center,
              ),
              if (refetch != null) ...[
                const SizedBox(height: 16),
                ElevatedButton(
                    style:
                        const ButtonStyle(visualDensity: VisualDensity.compact),
                    onPressed: () {
                      refetch?.call();
                    },
                    child: Text(S.of(context).action_retry))
              ]
            ],
          ),
        ),
      );
    }
    return const SizedBox();
  }
}

void showOperationErrorMessage(
    BuildContext context, OperationException? exception) {
  final errorMessage = getErrorMessage(context, exception);
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: KasiBanner(
    errorMessage,
    type: BannerType.error,
  )));
}

String getErrorMessage(BuildContext context, OperationException? exception) {
  if (exception?.graphqlErrors.isNotEmpty ?? false) {
    final message = exception!.graphqlErrors.first.message;
    // Messages techniques d'authentification du backend → message convivial
    // (ex. le garde NestJS renvoie "GqlAuthGuard" quand la session est absente/expirée).
    final lower = message.toLowerCase();
    if (message == 'GqlAuthGuard' ||
        lower.contains('unauthorized') ||
        lower.contains('unauthenticated') ||
        lower.contains('forbidden')) {
      return "Votre session a expiré. Veuillez vous reconnecter.";
    }
    return message;
  }
  if (exception.toString().contains("Connection closed") ||
      exception.toString().contains("Connection reset") ||
      exception.toString().contains("Connection refused") ||
      exception.toString().contains("Connection timed out") ||
      exception.toString().contains("Connection terminated") ||
      exception.toString().contains("Connection failed")) {
    return "Erreur réseau. Veuillez réessayer.";
  }
  return "Un problème est survenu lors du traitement de votre demande. Veuillez réessayer.";
}
