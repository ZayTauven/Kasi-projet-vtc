const { composePlugins, withNx } = require('@nx/webpack');

// Nx 17: la config webpack doit être explicite (isolatedConfig par défaut).
// withNx() reprend les options du target (tsPlugins NestJS GraphQL, assets, etc.).
module.exports = composePlugins(withNx(), (config) => {
  return config;
});
