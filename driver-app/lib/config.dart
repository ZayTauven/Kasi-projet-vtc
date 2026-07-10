// Production Kasi : driver-api derrière le reverse proxy nginx du VPS
// (le préfixe /driver-api/ est retiré par nginx, voir .nginx/kasi-locations.conf).
String serverUrl = "https://kasigroupe.tech/driver-api/";
String wsUrl = serverUrl.replaceFirst("http", "ws"); // https -> wss
