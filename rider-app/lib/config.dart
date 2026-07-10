// Production Kasi : rider-api derrière le reverse proxy nginx du VPS
// (le préfixe /rider-api/ est retiré par nginx, voir .nginx/kasi-locations.conf).
String serverUrl = "https://kasigroupe.tech/rider-api/";
String wsUrl = serverUrl.replaceFirst("http", "ws"); // https -> wss

// Nominatim configuration (Only for Open Street Maps and MapBox)
List<String>? nominatimCountries = ["sn"]; // ISO 3166-1alpha2 codes — Sénégal
String placesCountry = "en";
