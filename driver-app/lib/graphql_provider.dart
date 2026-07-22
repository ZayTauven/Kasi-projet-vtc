import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter/material.dart';

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

ValueNotifier<GraphQLClient> clientFor(
    {required String uri, required String subscriptionUri, String? jwtToken}) {
  final WebSocketLink websocketLink = jwtToken != null
      ? WebSocketLink(subscriptionUri,
          config: SocketClientConfig(initialPayload: {"authToken": jwtToken}))
      : WebSocketLink(subscriptionUri);
  final HttpLink httpLink = jwtToken != null
      ? HttpLink(uri, defaultHeaders: {"Authorization": "Bearer $jwtToken"})
      : HttpLink(uri);
  final Link link =
      Link.split((request) => request.isSubscription, websocketLink, httpLink);
  final GraphQLCache cache = GraphQLCache(store: HiveStore());
  return ValueNotifier<GraphQLClient>(
    GraphQLClient(
        cache: cache,
        link: link,
        // Le paquet `graphql` 5.2.4 applique par defaut un
        // `queryRequestTimeout` de 5 secondes a TOUTE query/mutation HTTP
        // (pas seulement les subscriptions, voir `query_manager.dart` /
        // `graphql_client.dart` du paquet). Sur un reseau mobile ou lors
        // d'un cold-start backend, ce delai est frequemment depasse et
        // declenche un `TimeoutException`, indiscernable cote appelant
        // d'une vraie absence de donnee ("Driver information not found").
        // On l'aligne sur une valeur realiste plutot que de garder le
        // defaut trop agressif de la librairie.
        queryRequestTimeout: const Duration(seconds: 20),
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
