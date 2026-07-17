import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'package:kasi_driver/l10n/messages.dart';
import 'package:client_shared/components/query_result_view.dart';

class QueryResultView extends StatelessWidget {
  final QueryResult queryResult;
  final Function()? refetch;

  const QueryResultView(this.queryResult, {Key? key, required this.refetch})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (queryResult.isLoading) {
      return QueryResultLoadingView(loadingText: S.of(context).loading);
    }
    if (queryResult.hasException) {
      if (queryResult.exception.toString().contains("Connection closed") ||
          queryResult.exception.toString().contains("Connection reset") ||
          queryResult.exception.toString().contains("Connection refused") ||
          queryResult.exception.toString().contains("Connection timed out") ||
          queryResult.exception.toString().contains("Connection terminated") ||
          queryResult.exception.toString().contains("Connection failed")) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Ionicons.cloud_offline,
                color: CustomTheme.neutralColors.shade700,
                size: 36,
              ),
              const SizedBox(height: 12),
              const Text("Network error, Please try again."),
              const SizedBox(height: 16),
              ElevatedButton(
                  style:
                      const ButtonStyle(visualDensity: VisualDensity.compact),
                  onPressed: () {
                    refetch?.call();
                  },
                  child: const Text("Retry"))
            ],
          ),
        );
      }
      return Center(
        child: Text(queryResult.exception.toString()),
      );
    }
    return Container();
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
