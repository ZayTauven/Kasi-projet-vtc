#!/usr/bin/env node
/**
 * Configure un environnement Kasi dans Dokploy via son API.
 *
 * Rejoue exactement ce qu on ferait a la main dans l UI (projet, service
 * Compose, source Git, variables, domaine), mais de facon reproductible : le
 * meme script sert pour la repetition locale, le staging et la production, en
 * ne changeant que la configuration passee en argument.
 *
 * Les noms de champs ci-dessous ne figurent pas dans la documentation Dokploy.
 * Ils ont ete releves en sondant l API : un POST avec un corps vide renvoie une
 * erreur Zod qui enumere les champs attendus. Meme methode si Dokploy change
 * son schema.
 *
 * Usage :
 *   DOKPLOY_URL=http://localhost:3000 \
 *   DOKPLOY_API_KEY=xxx \
 *   node tools/dokploy-setup.mjs --config tools/dokploy.local.json
 *
 * Le fichier de configuration (voir dokploy.example.json) ne doit JAMAIS
 * contenir de secrets : il pointe vers un fichier .env lu au moment de
 * l execution.
 *
 * ATTENTION : `domain.create` cree l objet meme avec un corps partiel, et
 * `domain.update` n accepte pas de rattacher un composeId apres coup. Le
 * rattachement doit donc se faire des la creation — d ou la suppression puis
 * recreation si un domaine existant vise le mauvais service.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const BASE = process.env.DOKPLOY_URL ?? 'http://localhost:3000';
const KEY = process.env.DOKPLOY_API_KEY;

if (!KEY) {
  console.error('DOKPLOY_API_KEY manquant (UI Dokploy : Settings > API/CLI).');
  process.exit(1);
}

/** Appelle l API Dokploy. GET pour les lectures, POST pour tout le reste. */
async function api(endpoint, { body, method } = {}) {
  const verb = method ?? (body ? 'POST' : 'GET');
  const url = new URL(`/api/${endpoint}`, BASE);
  if (verb === 'GET' && body) {
    for (const [k, v] of Object.entries(body)) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    method: verb,
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: verb === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  if (!res.ok) {
    // L erreur Zod porte le schema attendu : la remonter telle quelle rend le
    // diagnostic possible sans avoir a re-sonder l API.
    throw new Error(`${endpoint} -> HTTP ${res.status}\n${text.slice(0, 800)}`);
  }
  return text.trim() ? JSON.parse(text) : {};
}

const { values } = parseArgs({
  options: { config: { type: 'string' }, 'dry-run': { type: 'boolean' } },
});
if (!values.config) {
  console.error('--config <fichier.json> requis.');
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(values.config, 'utf8'));
const dryRun = values['dry-run'] ?? false;

/** Les variables vivent dans un .env hors du fichier de configuration. */
const envContent = readFileSync(cfg.envFile, 'utf8');

const log = (step, detail) => console.log(`  ${step.padEnd(22)} ${detail}`);

// -- 1. Projet ---------------------------------------------------------------
const projects = await api('project.all');
let project = projects.find((p) => p.name === cfg.project);
if (!project) {
  if (dryRun) { log('projet', `${cfg.project} (a creer)`); process.exit(0); }
  project = await api('project.create', {
    body: { name: cfg.project, description: cfg.description ?? '' },
  });
  log('projet cree', cfg.project);
} else {
  log('projet existant', `${cfg.project} (${project.projectId})`);
}

// L environnement par defaut porte le service ; Dokploy en cree un a la volee
// avec chaque projet.
const environment =
  project.environments?.find((e) => e.name === (cfg.environment ?? 'production')) ??
  project.environments?.find((e) => e.isDefault);
if (!environment) throw new Error(`Aucun environnement dans le projet ${cfg.project}.`);
log('environnement', `${environment.name} (${environment.environmentId})`);

// -- 2. Service Compose ------------------------------------------------------
let compose = environment.compose?.find((c) => c.name === cfg.service);
if (!compose) {
  if (dryRun) { log('service', `${cfg.service} (a creer)`); process.exit(0); }
  compose = await api('compose.create', {
    body: {
      name: cfg.service,
      environmentId: environment.environmentId,
      description: cfg.serviceDescription ?? '',
    },
  });
  log('service cree', `${cfg.service} (${compose.composeId})`);
} else {
  log('service existant', `${cfg.service} (${compose.composeId})`);
}

// -- 3. Cle SSH de deploiement ----------------------------------------------
// Dokploy genere la paire ; la partie publique doit etre installee comme
// "deploy key" en LECTURE SEULE sur le depot GitHub.
let sshKeyId = null;
if (cfg.sshKeyName) {
  const keys = await api('sshKey.all');
  const existing = keys.find((k) => k.name === cfg.sshKeyName);
  if (existing) {
    sshKeyId = existing.sshKeyId;
    log('cle SSH existante', cfg.sshKeyName);
  } else if (!dryRun) {
    const pair = await api('sshKey.generate', { body: { type: 'ed25519' } });
    await api('sshKey.create', {
      body: {
        name: cfg.sshKeyName,
        publicKey: pair.publicKey,
        privateKey: pair.privateKey,
        organizationId: project.organizationId,
      },
    });
    sshKeyId = (await api('sshKey.all')).find((k) => k.name === cfg.sshKeyName)?.sshKeyId;
    console.log('\n  Cle publique a installer dans GitHub > Settings > Deploy keys');
    console.log('  (ne PAS cocher "Allow write access") :\n');
    console.log(`  ${pair.publicKey}\n`);
  }
}

// -- 4. Source Git, chemin du compose et variables ---------------------------
if (!dryRun) {
  await api('compose.update', {
    body: {
      composeId: compose.composeId,
      sourceType: 'git',
      customGitUrl: cfg.repository,
      customGitBranch: cfg.branch,
      customGitSSHKeyId: sshKeyId,
      composePath: cfg.composePath ?? './docker-compose.dokploy.yml',
      composeType: 'docker-compose',
      env: envContent,
    },
  });
  log('source', `${cfg.repository} @ ${cfg.branch}`);
  log('compose', cfg.composePath ?? './docker-compose.dokploy.yml');
  log('variables', `${envContent.split('\n').filter(Boolean).length} definies`);
}

// -- 5. Domaine --------------------------------------------------------------
// Traefik route le domaine vers UN service du compose : `nginx`, qui garde
// tout le routage applicatif (/admin-api/, /driver-api/, /rider-api/, WS, CORS).
if (cfg.domain && !dryRun) {
  // Les domaines existants sont deja portes par compose.one : inutile
  // d appeler domain.byComposeId, qui n accepte que GET avec composeId en
  // parametre d URL (un POST y renvoie 404, pas une erreur de validation).
  const current = await api('compose.one', { method: 'GET', body: { composeId: compose.composeId } });
  const stale = (current.domains ?? []).find((d) => d.host === cfg.domain.host);
  if (stale) {
    await api('domain.delete', { body: { domainId: stale.domainId } });
    log('domaine', `ancien ${cfg.domain.host} supprime`);
  }
  await api('domain.create', {
    body: {
      host: cfg.domain.host,
      path: '/',
      port: 80,
      https: cfg.domain.https ?? false,
      serviceName: 'nginx',
      domainType: 'compose',
      composeId: compose.composeId,
      certificateType: cfg.domain.https ? 'letsencrypt' : 'none',
    },
  });
  log('domaine', `${cfg.domain.https ? 'https' : 'http'}://${cfg.domain.host} -> nginx:80`);
}

console.log(`\n  Configuration terminee. Deploiement :`);
console.log(`  curl -X POST -H "x-api-key: $DOKPLOY_API_KEY" \\`);
console.log(`    ${BASE}/api/compose.deploy -H 'content-type: application/json' \\`);
console.log(`    -d '{"composeId":"${compose.composeId}"}'`);
