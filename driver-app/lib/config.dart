// Adresse du backend driver-api.
//
// Elle etait figee en dur sur `http://192.168.1.2/driver-api/`, l'IP que le DHCP
// de la box avait attribuee a la machine de dev un jour donne. Au bail suivant
// l'IP a change (la machine est aujourd'hui en .76) et `192.168.1.2` designe
// desormais un tout autre appareil du reseau, qui repond 404 : toutes les
// requetes GraphQL echouaient, y compris `login`, sans que rien dans l'app
// n'indique la vraie cause.
//
// Surchargeable au build, donc sans rediter (ni recommiter) ce fichier :
//   flutter run --dart-define=KASI_SERVER_URL=http://192.168.1.50/driver-api/
//   flutter build apk --dart-define=KASI_SERVER_URL=https://kasigroupe.tech/driver-api/
//
// En production le prefixe /driver-api/ est retire par le reverse proxy nginx du
// VPS (voir .nginx/kasi-locations.conf). En dev local, nginx :80 -> driver-api:3002 ;
// `usesCleartextTraffic=true` autorise le http:// depuis un telephone du meme WiFi.
const String _defaultServerUrl = 'http://192.168.1.76/driver-api/';

String serverUrl = const String.fromEnvironment(
  'KASI_SERVER_URL',
  defaultValue: _defaultServerUrl,
);
String wsUrl = serverUrl.replaceFirst("http", "ws"); // http -> ws (wss en prod)
