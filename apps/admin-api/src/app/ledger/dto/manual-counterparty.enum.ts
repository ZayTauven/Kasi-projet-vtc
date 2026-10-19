import { registerEnumType } from '@nestjs/graphql';
import { ManualCounterparty } from '@kasi/order/ledger';

/**
 * p2-argent I2 (2026-10-19) : contrepartie d'une operation manuelle du
 * back-office (champ facultatif des entrees createDriverTransaction,
 * createRiderTransaction, createFleetTransaction). Ajout pur : le panel
 * actuel ne l'envoie pas, le serveur prend CORRECTIONS.
 */
registerEnumType(ManualCounterparty, {
  name: 'ManualCounterparty',
  description:
    'Contrepartie au grand livre : CORRECTIONS (defaut), PROMOTIONS (geste commercial), CAISSE (especes au siege)',
});

export { ManualCounterparty };
