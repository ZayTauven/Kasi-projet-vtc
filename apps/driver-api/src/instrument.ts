/**
 * p1-sentry (2026-10-20) : suivi des erreurs, initialise avant tout module
 * NestJS. Doit rester le PREMIER import de main.ts. Sans SENTRY_DSN_DRIVER_API :
 * aucun envoi. Voir libs/database/src/lib/monitoring/init-monitoring.ts.
 */
import { initMonitoring } from '@kasi/monitoring/init-monitoring';

initMonitoring('driver-api');
