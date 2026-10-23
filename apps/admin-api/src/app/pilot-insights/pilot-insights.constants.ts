import { PilotThresholdsDTO } from './dto/pilot-dashboard.dto';

/**
 * p3-mesures (2026-10-21) : seuils de reussite du pilote, valides par
 * l'utilisateur le 2026-10-21 (docs/fiche-mesures-pilote.md §6). Renvoyes avec
 * les indicateurs pour que l'ecran les affiche ; pas de reglage serveur.
 */
export const PILOT_THRESHOLDS: Readonly<PilotThresholdsDTO> = Object.freeze({
  assignmentMedianMaxSeconds: 180,
  serviceRateMin: 0.85,
  kasimanRetentionMin: 0.7,
  cashRecoveryMin: 0.9,
  recurringClientsMin: 0.3,
  breakEvenMonthlyOrders: 5000,
});

/** Devise du pilote (une seule, XOF) : celle de l'indicateur 5. */
export const PILOT_CURRENCY = 'XOF';

/** Mois de la projection face au point mort. */
export const PILOT_MONTH_DAYS = 30;

/** Periode maximale d'une requete (garde-fou de charge). */
export const PILOT_MAX_DAYS = 400;

/** Classement des Kasimen : 10 premiers (BetterSuite). */
export const PILOT_TOP_KASIMEN = 10;

/** Motifs d'annulation du tableau : 5 premiers (fiche §3, indicateur 4). */
export const PILOT_TOP_REASONS = 5;

/** Zones de demande non servie par tranche. */
export const PILOT_TOP_ZONES = 10;

/** Note de l'app client : etoiles x 20 (rate_ride_sheet_view.dart). 3 etoiles = 60. */
export const PILOT_SCORE_PER_STAR = 20;
export const PILOT_LOW_SCORE_MAX = 3 * PILOT_SCORE_PER_STAR;
