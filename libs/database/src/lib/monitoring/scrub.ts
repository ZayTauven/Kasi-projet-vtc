/**
 * p1-sentry (2026-10-20) : ce qui part vers le suivi des erreurs, et ce qui
 * n'y part pas. Fiche : docs/fiche-suivi-des-erreurs.md §4 et §5.
 *
 * Aucune dependance a NestJS : ce fichier est charge par instrument.ts avant
 * tout module Nest (l'instrumentation de @nestjs/schedule et BullMQ n'agit que
 * sur les modules charges apres Sentry.init).
 *
 * Donnees jamais envoyees : corps et variables GraphQL, en-tetes (dont
 * Authorization), cookies, connectionParams, numeros de telephone, coordonnees,
 * jetons (JWT, FCM, Bearer), noms et adresses portes par les champs connus.
 * Seul l'identifiant interne de l'utilisateur est garde.
 */

/** Champs dont la valeur est remplacee, quel que soit leur contenu. */
const SENSITIVE_KEYS = new Set(
  [
    'authorization',
    'authtoken',
    'token',
    'accesstoken',
    'refreshtoken',
    'password',
    'secret',
    'privatekey',
    'cookie',
    'cookies',
    'connectionparams',
    'variables',
    'mobilenumber',
    'phonenumber',
    'phone',
    'email',
    'firstname',
    'lastname',
    'address',
    'addresses',
    'points',
    'point',
    'location',
    'lat',
    'lng',
    'latitude',
    'longitude',
    'notificationplayerid',
    'fcmtoken',
    'firebasetoken',
    'accountnumber',
    'bankname',
    'recipientname',
    'recipientmobilenumber',
    'deliveryinstructions',
  ].map((k) => k.toLowerCase()),
);

/** En-tetes gardes (diagnostic sans donnee personnelle). */
const KEPT_HEADERS = new Set(['user-agent', 'content-type', 'content-length']);

export const FILTERED = '[filtre]';

const PATTERNS: Array<[RegExp, string]> = [
  // Jetons JWT (session des apps, Firebase ID token).
  [/eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g, '[jwt]'],
  // Bearer <jeton>.
  [/Bearer\s+[\w.~+/=-]{8,}/gi, 'Bearer [jeton]'],
  // Jetons FCM (identifiant d'appareil : prefixe ':APA91b').
  [/[\w-]{10,}:APA91b[\w-]{20,}/g, '[jeton-fcm]'],
  // Numeros senegalais : +221 / 00221 / 221 suivi de 9 chiffres, ou 9 chiffres
  // commencant par 7 ou 3 (mobiles et fixes), espaces et points toleres.
  [/(?:\+|00)?221[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '[telephone]'],
  [/\b[73]\d[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '[telephone]'],
  // Coordonnees : nombre decimal a 4 decimales ou plus (Dakar : 14.69, -17.44).
  [/-?\b\d{1,3}\.\d{4,}\b/g, '[coord]'],
];

/** Texte libre (message, valeur d'exception, fil d'Ariane) nettoye. */
export function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Valeur quelconque nettoyee en profondeur (objets, tableaux, textes). */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return value;
  if (depth > 8) return FILTERED;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? FILTERED : scrubValue(inner, depth + 1);
  }
  return out;
}

/**
 * Erreur attendue (refus metier, requete invalide) : ni journalisee comme
 * incident, ni envoyee. Erreurs GraphQL a code metier (`FORBIDDEN` de
 * ForbiddenError, `QUOTE_EXPIRED`, `KASIMAN_DEBT_LIMIT`...) et HttpException
 * de statut < 500 (garde d'authentification, validation). Une erreur sans
 * code, ou `INTERNAL_SERVER_ERROR`, reste un incident.
 */
export function isExpectedError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as {
    getStatus?: () => number;
    extensions?: { code?: unknown };
  };
  if (typeof e.getStatus === 'function') {
    const status = Number(e.getStatus());
    return Number.isFinite(status) && status < 500;
  }
  const code = e.extensions?.code;
  return typeof code === 'string' && code !== '' && code !== 'INTERNAL_SERVER_ERROR';
}

/** Forme minimale d'un evenement Sentry (sans dependre de ses types). */
export interface ScrubbableEvent {
  message?: string;
  user?: { id?: string | number } & Record<string, unknown>;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    data?: unknown;
    cookies?: unknown;
    query_string?: unknown;
    env?: unknown;
  } & Record<string, unknown>;
  exception?: { values?: Array<{ value?: string } & Record<string, unknown>> };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: ScrubbableBreadcrumb[];
  server_name?: string;
}

export interface ScrubbableBreadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.message != null) event.message = scrubString(event.message);
  if (event.user != null) {
    event.user = event.user.id == null ? {} : { id: event.user.id };
  }
  if (event.request != null) {
    const headers = event.request.headers ?? {};
    event.request = {
      url: event.request.url == null ? undefined : event.request.url.split('?')[0],
      method: event.request.method,
      headers: Object.fromEntries(
        Object.entries(headers).filter(([k]) => KEPT_HEADERS.has(k.toLowerCase())),
      ),
    };
  }
  for (const value of event.exception?.values ?? []) {
    if (value.value != null) value.value = scrubString(value.value);
  }
  if (event.extra != null) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts != null) event.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  if (event.breadcrumbs != null) {
    event.breadcrumbs = event.breadcrumbs
      .map((b) => scrubBreadcrumb(b))
      .filter((b): b is ScrubbableBreadcrumb => b != null);
  }
  // Nom d'hote du conteneur : sans interet, et identifie la machine.
  delete event.server_name;
  return event;
}

/**
 * Fil d'Ariane : les journaux (`console`) sont ecartes. Ils contiennent des
 * objets entiers (Kasiman, course, jetons) et restent lisibles dans les
 * journaux Docker. Les autres (requetes HTTP sortantes...) sont nettoyes.
 */
export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(breadcrumb: T): T | null {
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.message != null) breadcrumb.message = scrubString(breadcrumb.message);
  if (breadcrumb.data != null) {
    const data = scrubValue(breadcrumb.data) as Record<string, unknown>;
    if (typeof data['url'] === 'string') data['url'] = (data['url'] as string).split('?')[0];
    breadcrumb.data = data;
  }
  return breadcrumb;
}
