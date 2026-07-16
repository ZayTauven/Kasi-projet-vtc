// Production Kasi : driver-api derrière le reverse proxy nginx du VPS
// (le préfixe /driver-api/ est retiré par nginx, voir .nginx/kasi-locations.conf).
// String serverUrl = "https://kasigroupe.tech/driver-api/"; // ← PROD (rebasculer au déploiement)
// DEV LOCAL : stack Docker sur la machine (192.168.1.2), proxy nginx :80 → driver-api:3002.
// Téléphone physique sur le même WiFi ; usesCleartextTraffic=true autorise le http://.
String serverUrl = "http://192.168.1.2/driver-api/";
String wsUrl = serverUrl.replaceFirst("http", "ws"); // http -> ws (wss en prod)
