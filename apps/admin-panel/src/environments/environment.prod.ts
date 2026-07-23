export const environment = {
  production: true,
  // Chemins relatifs via le reverse-proxy nginx (voir app-kasi/.nginx/default.conf,
  // location /admin-api/) — l app doit etre chargee via http://<host>/ (port 80),
  // pas directement sur le port du conteneur admin-panel (8080 en dev local).
  root: `${window.location.protocol}//${window.location.host}/admin-api/`,
  wsEndpoint: `${window.location.protocol.replace(
    "http",
    "ws",
  )}//${window.location.host}/admin-api/graphql`,
  mapboxToken: "", // à définir via variable d'environnement/config au build, ne pas committer
};
