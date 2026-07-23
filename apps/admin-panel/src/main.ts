import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import mapboxgl from 'mapbox-gl';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Fix "An error occurred while parsing the WebWorker bundle" : le builder
// Angular (webpack) bundle mapbox-gl.js et casse son worker auto-hébergé
// (blob URL généré à partir de son propre script source, incompatible avec
// le bundling webpack). On bascule sur un worker self-hosted servi en asset
// statique — approche officielle documentée par Mapbox pour ce cas de figure
// (cf. mapboxgl.workerUrl dans mapbox-gl.d.ts). Doit être fait avant toute
// instanciation de `new mapboxgl.Map(...)`, donc ici, avant le bootstrap.
mapboxgl.workerUrl = 'assets/mapbox-gl-csp-worker.js';

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));
