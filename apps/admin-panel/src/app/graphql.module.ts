import { NgModule } from '@angular/core';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import {
  ApolloClientOptions,
  ApolloLink,
  InMemoryCache,
  split,
} from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { DefaultOptions } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { environment } from '@kasi/admin-panel/src/environments/environment';
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
2;
import { createClient } from 'graphql-ws';

export function createApollo(
  httpLink: HttpLink
): ApolloClientOptions {
  const http = httpLink.create({
    uri: `${environment.root}graphql`,
  });
  // const wsLink = new WebSocketLink({
  //   uri: environment.wsEndpoint,
  //   options: {
  //     reconnect: true,
  //     connectionParams: {
  //       authToken: localStorage.getItem('kasi_admin_token')
  //     }
  //   },
  // });
  const wsLink = new GraphQLWsLink(
    createClient({
      url: environment.wsEndpoint,
      connectionParams: () => ({
        authToken: localStorage.getItem('kasi_admin_token'),
      }),
    })
  );
  const basic = setContext(() => ({
    headers: {
      Accept: 'charset=utf-8',
    },
  }));
  const auth = setContext(() => {
    return {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('kasi_admin_token')}`,
      },
    };
  });
  const defaultOptions: DefaultOptions = {
    watchQuery: {
      fetchPolicy: 'no-cache',
      //errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'no-cache',
      //errorPolicy: 'all',
    },
  };
  const link = ApolloLink.from([basic, auth, http]);
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    link
  );

  return {
    // NOTE(kasi): l'option `addTypename: false` d'InMemoryCache a ete
    // supprimee dans Apollo Client 4 (migration Apollo Client 3->4 /
    // apollo-angular 6->14, admin-panel). Impact juge negligeable ici
    // car tous les fetchPolicy par defaut sont deja en 'no-cache' (voir
    // defaultOptions ci-dessous) : le cache normalise n'est jamais lu ni
    // ecrit, seule l'ecriture d'un champ __typename supplementaire dans
    // les requetes envoyees au serveur change.
    cache: new InMemoryCache(),
    link: splitLink,
    defaultOptions,
  };
}

@NgModule({
  providers: [
    // NOTE(kasi): apollo-angular v14 a retire `ApolloModule` (qui fournissait
    // implicitement le service `Apollo` via son propre NgModule). `Apollo` est
    // toujours un `@Injectable()` SANS `providedIn: 'root'` (verifie dans
    // node_modules/apollo-angular/fesm2022/apollo-angular.mjs) -> sans cette
    // ligne, aucune classe generee (XxxGQL extends Apollo.Query/Mutation/
    // Subscription, dont le constructeur exige `Apollo` de facon non
    // optionnelle) ne peut etre instanciee -> NG0201 (No provider for Apollo)
    // des le premier GQL injecte, qui bloque tout le bootstrap de l'app
    // (ecran noir permanent, meme en navigation privee).
    Apollo,
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
