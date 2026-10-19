/**
 * Banc de tests d'integration du backend Kasi (points p1-tests, p1-transitions,
 * p1-unicite). Mode d'emploi complet : docs/tests-integration.md.
 *
 *   npm run test:integration                 # tous les fichiers *.int-spec.ts
 *   npm run test:integration -- transitions  # filtre sur le chemin
 *
 * - Vraie base PostgreSQL : `kasi_test` dans le conteneur kasi-postgres (port
 *   hote 5433), creee et mise a niveau par les migrations (global-setup.ts).
 *   Jamais la base `kasi` (jeu de demo) : le banc refuse de s'y connecter.
 * - Vrai Redis : l'instance locale, base logique dediee n. 15 (KASI_TEST_REDIS_DB).
 * - Fichiers executes l'un apres l'autre (maxWorkers 1) : ils partagent la base.
 * - Compilation ts-jest AVEC verification de types (pas d'isolatedModules) :
 *   en compilation isolee, un champ type par une enum importee recoit
 *   design:type = Object et TypeORM refuse l'entite (meme raison que les
 *   scripts npm migration:*).
 */
const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.base.json');

const root = path.resolve(__dirname, '..', '..');

module.exports = {
  displayName: 'integration',
  rootDir: root,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/apps/*/src/**/*.int-spec.ts',
    '<rootDir>/libs/*/src/**/*.int-spec.ts',
  ],
  transform: {
    '^.+\.ts$': [
      'ts-jest',
      {
        tsconfig: path.join(__dirname, 'tsconfig.json'),
        // Les types sont verifies par les builds des API ; ici on garde
        // l'emission complete (metadonnees de decorateurs) sans bloquer sur
        // un diagnostic d'un fichier importe.
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Ni les builds (dist/) ni les copies de travail des agents (.claude/).
  roots: ['<rootDir>/apps', '<rootDir>/libs', '<rootDir>/tools'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.claude/', '<rootDir>/tmp/'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    // uuid 14 est ESM uniquement (voir uuid-shim.js).
    '^uuid$': path.join(__dirname, 'uuid-shim.js'),
    // `import { version } from 'package.json'` des controleurs (baseUrl = racine).
    '^package\\.json$': '<rootDir>/package.json',
  },
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  setupFiles: [path.join(__dirname, 'env.ts')],
  maxWorkers: 1,
  testTimeout: 120000,
};
