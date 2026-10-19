/**
 * uuid 14 (dependance de @ptc-org/nestjs-query-typeorm) n'est publie qu'en ESM,
 * que le chargeur de modules de Jest ne sait pas lire en CommonJS. Seul v4 est
 * utilise (nom d'alias aleatoire) : equivalent natif de Node.
 */
const { randomUUID } = require('crypto');
module.exports = { v4: () => randomUUID() };
