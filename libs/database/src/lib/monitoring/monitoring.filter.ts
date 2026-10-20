import { ArgumentsHost, Catch } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

import { isExpectedError } from './scrub';

/**
 * p1-sentry (2026-10-20) : filtre global des 3 API (`APP_FILTER`).
 *
 * Celui de Sentry, tel quel, journalise en erreur (avec la pile) chaque
 * exception GraphQL qui n'est pas une HttpException : chaque refus metier
 * (`Already Taken`, `QUOTE_EXPIRED`, `KASIMAN_DEBT_LIMIT`...) serait devenu
 * un incident dans les journaux. Les refus attendus sont donc relances tels
 * quels, sans journal ni envoi.
 *
 * Contrat mobile : en GraphQL, l'exception est toujours relancee telle quelle
 * (Apollo la met en forme comme avant) ; en HTTP, la reponse est celle du
 * filtre par defaut de NestJS. Sans DSN, captureException ne fait rien.
 */
@Catch()
export class KasiMonitoringFilter extends SentryGlobalFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<string>() === 'graphql' && isExpectedError(exception)) {
      throw exception;
    }
    return super.catch(exception, host);
  }
}
