/**
 * Kasi — service worker « safety » (auto-désinscription).
 *
 * Le panel n'utilise PAS de PWA/offline : le ServiceWorkerModule hérité du
 * template Ridy enregistrait `ngsw-worker.js` en production alors qu'aucun
 * vrai service worker n'était généré (pas de ngsw-config.json). Résultat :
 * un SW périmé restait actif dans les navigateurs et servait un index.html
 * en cache pointant vers d'anciens bundles hashés -> page blanche après
 * chaque redéploiement.
 *
 * Ce fichier remplace ce script. Tout navigateur ayant un ancien SG le
 * récupère lors de son cycle de mise à jour, se désinscrit lui-même et
 * purge les caches `ngsw:`. Après un rechargement, la page est de nouveau
 * servie directement par le réseau. L'enregistrement du SW est par ailleurs
 * désactivé dans app.module.ts pour ne plus jamais en recréer.
 *
 * Dérivé de @angular/service-worker/safety-worker.js (licence MIT, Google LLC).
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());

  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('Kasi safety worker — ancien service worker désinscrit');
    })
  );

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const ngswCacheNames = cacheNames.filter((name) => /^ngsw:/.test(name));
      return Promise.all(ngswCacheNames.map((name) => caches.delete(name)));
    })
  );
});
