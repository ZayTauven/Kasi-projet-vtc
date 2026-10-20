/**
 * p1-sentry (2026-10-20) : suivi des erreurs des API, repris de BetterSuite
 * 5.3.2 (`apps/*-api/src/instrument.ts`, `bs-stack-monitoring`) et corrige
 * selon la fiche (docs/fiche-suivi-des-erreurs.md §2 et §4) :
 * - un seul point d'entree pour les 3 API, sans effet sans DSN (dev local,
 *   banc d'integration : rien n'est envoye) ;
 * - `sendDefaultPii: false`, pas de traces ni de profilage, donnees
 *   personnelles filtrees (scrub.ts) ;
 * - DSN jamais ecrit dans les journaux, aucune route de test publique ;
 * - meme code pour GlitchTip (cible) ou Sentry SaaS : seul le DSN change.
 *
 * A importer en PREMIERE ligne de main.ts (via instrument.ts) : Sentry ne
 * capte les erreurs de @nestjs/schedule et des processeurs BullMQ que pour les
 * modules charges apres son initialisation. Ni NestJS ni la lib database ici.
 */
import * as Sentry from '@sentry/nestjs';

import {
  isExpectedError,
  scrubBreadcrumb,
  ScrubbableBreadcrumb,
  ScrubbableEvent,
  scrubEvent,
} from './scrub';

export type KasiApi = 'admin-api' | 'driver-api' | 'rider-api';

/** SENTRY_DSN_ADMIN_API, SENTRY_DSN_DRIVER_API, SENTRY_DSN_RIDER_API. */
export function dsnVariable(api: KasiApi): string {
  return `SENTRY_DSN_${api.toUpperCase().replace('-', '_')}`;
}

/** Vrai si le suivi est actif (DSN fourni). */
export function initMonitoring(api: KasiApi): boolean {
  const dsn = process.env[dsnVariable(api)]?.trim();
  if (dsn == null || dsn === '') {
    console.log(`[Monitoring] ${api} : suivi des erreurs inactif (${dsnVariable(api)} vide).`);
    return false;
  }
  const environment = process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'production';
  Sentry.init({
    dsn,
    environment,
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    initialScope: { tags: { service: api } },
    // scrub.ts ne depend pas des types du SDK : conversion a la frontiere.
    beforeSend(event, hint) {
      if (isExpectedError(hint.originalException)) return null;
      return scrubEvent(event as unknown as ScrubbableEvent) as unknown as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb as ScrubbableBreadcrumb) as typeof breadcrumb | null;
    },
  });
  console.log(`[Monitoring] ${api} : suivi des erreurs actif (environnement ${environment}).`);
  return true;
}
