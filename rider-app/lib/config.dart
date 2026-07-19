// Production Kasi : rider-api derrière le reverse proxy nginx du VPS
// (le préfixe /rider-api/ est retiré par nginx, voir .nginx/kasi-locations.conf).
// String serverUrl = "https://kasigroupe.tech/rider-api/"; // ← PROD (rebasculer au déploiement)
// DEV LOCAL : stack Docker sur la machine (192.168.1.2), proxy nginx :80 → rider-api:3001.
// Téléphone physique sur le même WiFi ; usesCleartextTraffic=true autorise le http://.
String serverUrl = "http://192.168.1.2/rider-api/";
String wsUrl = serverUrl.replaceFirst("http", "ws"); // http -> ws (wss en prod)

// Nominatim configuration (Only for Open Street Maps and MapBox)
List<String>? nominatimCountries = ["sn"]; // ISO 3166-1alpha2 codes — Sénégal
// Passé comme paramètre `language` au géocodage backend (getPlaces /
// reverseGeocode) : "fr" pour des libellés d'adresses en français (Dakar).
String placesCountry = "fr";
