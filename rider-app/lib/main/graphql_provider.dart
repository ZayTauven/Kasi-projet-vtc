import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:kasi_rider/config.dart';
import 'package:kasi_rider/main/bloc/jwt_cubit.dart';
import 'package:kasi_rider/monitoring/crash_reporting.dart';
import 'package:kasi_rider/monitoring/graphql_error_reporting_link.dart';
import 'package:kasi_rider/main/request_timeout_link.dart';

/// Dernier lien WebSocket créé par [clientFor] (bug-rafraichissement). Lu par
/// `CurrentOrderResyncScope` pour observer l'état du socket et relire la
/// course à sa reconnexion. Simple observation : ne change rien au lien.
WebSocketLink? activeWebSocketLink;

ValueNotifier<GraphQLClient> clientFor(
    {required String uri, required String subscriptionUri, String? jwtToken}) {
  final WebSocketLink websocketLink = jwtToken != null
      ? WebSocketLink(subscriptionUri,
          config: SocketClientConfig(
              initialPayload: {"authToken": jwtToken},
              inactivityTimeout: const Duration(minutes: 30)),
          subProtocol: GraphQLProtocol.graphqlWs)
      : WebSocketLink(subscriptionUri, subProtocol: GraphQLProtocol.graphqlWs);
  activeWebSocketLink = websocketLink;
  final HttpLink httpLink = jwtToken != null
      ? HttpLink(uri, defaultHeaders: {"Authorization": "Bearer $jwtToken"})
      : HttpLink(uri);
  // p1-sentry : lien passif en tete de chaine, qui remonte les incidents
  // GraphQL a Crashlytics sans toucher aux requetes ni aux reponses.
  final Link link = Link.from([
    GraphQLErrorReportingLink(errorReporter),
    // bug-timeout : delai de 20 s applique ici, voir RequestTimeoutLink.
    RequestTimeoutLink(),
    Link.split((request) => request.isSubscription, websocketLink, httpLink),
  ]);
  //final GraphQLCache cache = GraphQLCache(store: HiveStore());
  return ValueNotifier<GraphQLClient>(
    GraphQLClient(
        cache: GraphQLCache(),
        link: link,
        // Le paquet `graphql` 5.2.4 applique par defaut un
        // `queryRequestTimeout` de 5 secondes a toute query/mutation HTTP.
        // Ce delai etait porte a 20 s ici, mais le minuteur du paquet n'annule
        // pas la requete : une reponse arrivee apres le delai levait
        // « Bad state: Future already completed » (bug-timeout). Le delai de
        // 20 s est desormais applique par `RequestTimeoutLink` (meme
        // `TimeoutException` pour l'appelant, reponse tardive ignoree) ; celui
        // du paquet est donc coupe.
        queryRequestTimeout: null,
        defaultPolicies: DefaultPolicies(
            query: Policies(fetch: FetchPolicy.noCache),
            mutate: Policies(fetch: FetchPolicy.noCache),
            subscribe: Policies(fetch: FetchPolicy.noCache))),
  );
}

/// Wraps the root application with the `graphql_flutter` client.
/// We use the cache for all state management.
class _MyGraphqlProvider extends StatelessWidget {
  _MyGraphqlProvider(
      {Key? key,
      required this.child,
      required String uri,
      required String subscriptionUri,
      String? jwt})
      : client = clientFor(
            uri: uri, subscriptionUri: subscriptionUri, jwtToken: jwt),
        super(key: key);

  final Widget child;
  final ValueNotifier<GraphQLClient> client;

  @override
  Widget build(BuildContext context) {
    return GraphQLProvider(
      client: client,
      child: child,
    );
  }
}

class MyGraphqlProvider extends StatelessWidget {
  final Widget child;

  const MyGraphqlProvider({required this.child, Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<JWTCubit, String?>(
      builder: (context, state) {
        return _MyGraphqlProvider(
            uri: "${serverUrl}graphql",
            subscriptionUri: "${wsUrl}graphql",
            jwt: state,
            child: child);
      },
    );
  }
}
