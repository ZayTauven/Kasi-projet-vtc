/**
 * p1-sentry (2026-10-20) : filtrage des donnees personnelles avant envoi au
 * suivi des erreurs (fiche docs/fiche-suivi-des-erreurs.md §5).
 *
 *   npx jest -c libs/database/jest.config.ts monitoring
 */
import { ForbiddenError } from '@nestjs/apollo';
import { HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { GraphQLError } from 'graphql';

import { dsnVariable, initMonitoring } from './init-monitoring';
import {
  FILTERED,
  isExpectedError,
  scrubBreadcrumb,
  scrubEvent,
  scrubString,
  ScrubbableEvent,
} from './scrub';

describe('p1-sentry : filtrage des donnees personnelles', () => {
  it('numeros senegalais, sous toutes leurs formes', () => {
    for (const phone of ['+221 77 123 45 67', '+221771234567', '00221771234567', '221771234567', '77 123 45 67', '771234567', '33 821 00 00']) {
      expect(scrubString(`Kasiman ${phone} introuvable`)).toBe('Kasiman [telephone] introuvable');
    }
    // Un identifiant de course ou un horodatage ne sont pas des numeros.
    expect(scrubString('course 4512 a 1792471583975')).toBe('course 4512 a 1792471583975');
  });

  it('jetons JWT, Bearer et FCM', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTIzfQ.c2lnbmF0dXJlLXRlc3Q';
    expect(scrubString(`jeton ${jwt} refuse`)).toBe('jeton [jwt] refuse');
    expect(scrubString('Authorization: Bearer abcdef0123456789')).toBe('Authorization: Bearer [jeton]');
    const fcm = 'dGhpc2lzZmNt:APA91bHPRgkF3JUikC4ENAHEeMrd41Zxv3hVZjC9KtT8OvPVGJ';
    expect(scrubString(`push vers ${fcm}`)).toBe('push vers [jeton-fcm]');
  });

  it('coordonnees (4 decimales ou plus), sans toucher aux versions ni aux montants', () => {
    expect(scrubString('point (14.6928, -17.4467)')).toBe('point ([coord], [coord])');
    expect(scrubString('version 10.76.0, montant 1130.5')).toBe('version 10.76.0, montant 1130.5');
  });

  it('evenement : corps, variables, en-tetes, cookies et requete retires ; utilisateur reduit a son id', () => {
    const event: ScrubbableEvent = {
      message: 'Echec pour +221771234567',
      user: { id: 42, ip_address: '41.82.10.1', username: 'Awa' },
      request: {
        url: 'https://kasigroupe.tech/rider-api/graphql?token=secret',
        method: 'POST',
        headers: { authorization: 'Bearer abcdef0123456789', 'user-agent': 'Dart/3.5', cookie: 'x=1' },
        data: '{"query":"mutation","variables":{"mobileNumber":"221771234567"}}',
        cookies: { x: '1' },
        query_string: 'token=secret',
      },
      exception: { values: [{ type: 'Error', value: 'Kasiman 771234567 a (14.6928, -17.4467)' }] },
      extra: {
        driver: { id: 7, firstName: 'Moussa', mobileNumber: 221771234567, notificationPlayerId: 'abc' },
        points: [{ lat: 14.69, lng: -17.44 }],
        connectionParams: { authToken: 'x' },
        note: 'appel de 77 123 45 67',
      },
      contexts: { runtime: { name: 'node', version: 'v22.0.0' } },
      server_name: 'kasi-rider-api',
    };
    const out = scrubEvent(event);
    expect(out.message).toBe('Echec pour [telephone]');
    expect(out.user).toEqual({ id: 42 });
    expect(out.request).toEqual({
      url: 'https://kasigroupe.tech/rider-api/graphql',
      method: 'POST',
      headers: { 'user-agent': 'Dart/3.5' },
    });
    expect(out.exception?.values?.[0].value).toBe('Kasiman [telephone] a ([coord], [coord])');
    expect(out.extra).toEqual({
      driver: { id: 7, firstName: FILTERED, mobileNumber: FILTERED, notificationPlayerId: FILTERED },
      points: FILTERED,
      connectionParams: FILTERED,
      note: 'appel de [telephone]',
    });
    expect(out.contexts).toEqual({ runtime: { name: 'node', version: 'v22.0.0' } });
    expect(out.server_name).toBeUndefined();
  });

  it('fil d Ariane : journaux ecartes, requetes HTTP nettoyees', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'getting orders for driver {...}' })).toBeNull();
    expect(
      scrubBreadcrumb({
        category: 'http',
        data: { url: 'https://api.mapbox.com/directions?access_token=pk.secret', method: 'GET' },
      }),
    ).toEqual({ category: 'http', data: { url: 'https://api.mapbox.com/directions', method: 'GET' } });
  });
});

describe('p1-sentry : erreurs attendues (ni journalisees comme incident, ni envoyees)', () => {
  it('refus metier GraphQL et HttpException < 500 : attendus', () => {
    expect(isExpectedError(new ForbiddenError('Already Taken'))).toBe(true);
    expect(isExpectedError(new GraphQLError('Devis expire', { extensions: { code: 'QUOTE_EXPIRED' } }))).toBe(true);
    expect(isExpectedError(new UnauthorizedException())).toBe(true);
    expect(isExpectedError(new HttpException('introuvable', 404))).toBe(true);
  });

  it('erreurs inattendues : envoyees', () => {
    expect(isExpectedError(new Error('reading transactionNumber of undefined'))).toBe(false);
    expect(isExpectedError(new TypeError('x is not a function'))).toBe(false);
    expect(isExpectedError(new GraphQLError('boom'))).toBe(false);
    expect(isExpectedError(new GraphQLError('boom', { extensions: { code: 'INTERNAL_SERVER_ERROR' } }))).toBe(false);
    expect(isExpectedError(new InternalServerErrorException())).toBe(false);
    expect(isExpectedError('texte')).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});

describe('p1-sentry : initialisation', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('nom des variables de DSN par API', () => {
    expect(dsnVariable('admin-api')).toBe('SENTRY_DSN_ADMIN_API');
    expect(dsnVariable('driver-api')).toBe('SENTRY_DSN_DRIVER_API');
    expect(dsnVariable('rider-api')).toBe('SENTRY_DSN_RIDER_API');
  });

  it('sans DSN (dev local, banc) : inactif, et le DSN n est jamais journalise', () => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((m: string) => void logs.push(m));
    delete process.env.SENTRY_DSN_DRIVER_API;
    expect(initMonitoring('driver-api')).toBe(false);
    process.env.SENTRY_DSN_DRIVER_API = '   ';
    expect(initMonitoring('driver-api')).toBe(false);
    spy.mockRestore();
    expect(logs.join('\n')).toContain('inactif');
  });
});
