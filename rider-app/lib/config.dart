// Adresse du backend rider-api.
//
// Elle etait figee en dur sur `http://192.168.1.2/rider-api/`, l'IP que le DHCP
// de la box avait attribuee a la machine de dev un jour donne. Au bail suivant
// l'IP a change (la machine est aujourd'hui en .76) et `192.168.1.2` designe
// desormais un tout autre appareil du reseau, qui repond 404 : toutes les
// requetes GraphQL echouaient, y compris `login`, sans que rien dans l'app
// n'indique la vraie cause.
//
// Surchargeable au build, donc sans rediter (ni recommiter) ce fichier :
//   flutter run --dart-define=KASI_SERVER_URL=http://192.168.1.50/rider-api/
//   flutter build apk --dart-define=KASI_SERVER_URL=https://kasigroupe.tech/rider-api/
//
// En production le prefixe /rider-api/ est retire par le reverse proxy nginx du
// VPS (voir .nginx/kasi-locations.conf). En dev local, nginx :80 -> rider-api:3001 ;
// `usesCleartextTraffic=true` autorise le http:// depuis un telephone du meme WiFi.
const String _defaultServerUrl = 'http://192.168.1.76/rider-api/';

String serverUrl = const String.fromEnvironment(
  'KASI_SERVER_URL',
  defaultValue: _defaultServerUrl,
);
String wsUrl = serverUrl.replaceFirst("http", "ws"); // http -> ws (wss en prod)

// Nominatim configuration (Only for Open Street Maps and MapBox)
List<String>? nominatimCountries = ["sn"]; // ISO 3166-1alpha2 codes — Sénégal
// Passé comme paramètre `language` au géocodage backend (getPlaces /
// reverseGeocode) : "fr" pour des libellés d'adresses en français (Dakar).
String placesCountry = "fr";
