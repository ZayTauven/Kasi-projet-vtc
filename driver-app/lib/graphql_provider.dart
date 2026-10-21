import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter/material.dart';
import 'package:kasi_driver/monitoring/crash_reporting.dart';
import 'package:kasi_driver/monitoring/graphql_error_reporting_link.dart';
import 'package:kasi_driver/request_timeout_link.dart';

/*String get host {
  if (Platform.isAndroid) {
    return '10.0.2.2';
  } else {
    return 'localhost';
  }
}

final client = getClient(
  uri: "http://localhost:3002/graphql",
  subscriptionUri: "ws:localhost:3002/graphql",
);

final cache = GraphQLCache(store: InMemoryStore());

GraphQLClient getClient({
  required String uri,
  String? subscriptionUri,
}) {
  Link link = HttpLink(uri);

  if (subscriptionUri != null) {
    final WebSocketLink websocketLink = WebSocketLink(
      subscriptionUri,
      config: SocketClientConfig(
        autoReconnect: true,
        inactivityTimeout: Duration(seconds: 30),
      ),
    );

    // link = link.concat(websocketLink);
    link = Link.split((request) => request.isSubscription, websocketLink, link);
  }

  return GraphQLClient(
    cache: cache,
    link: link,
  );
}*/

/// Dernier lien WebSocket créé par [clientFor] (p1-resync). Lu par
/// `OrdersResyncScope` pour observer l'état de connexion du socket et relire
/// les offres à sa reconnexion. Simple observation : ce fichier ne change rien
/// au comportement du lien ni aux appels GraphQL.
WebSocketLink? activeWebSocketLink;

ValueNotifier<GraphQLClient> clientFor(
    {required String uri, required String subscriptionUri, String? jwtToken}) {
  final WebSocketLink websocketLink = jwtToken != null
      ? WebSocketLink(subscriptionUri,
          config: SocketClientConfig(initialPayload: {"authToken": jwtToken}))
      : WebSocketLink(subscriptionUri);
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
  final GraphQLCache cache = GraphQLCache(store: HiveStore());
  return ValueNotifier<GraphQLClient>(
    GraphQLClient(
        cache: cache,
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
class MyGraphqlProvider extends StatelessWidget {
  MyGraphqlProvider(
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
