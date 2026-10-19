/**
 * p2-argent I2 (2026-10-19) : vocabulaire du grand livre en partie double
 * (docs/fiche-conception-argent.md §3.2 a §3.4).
 *
 * Stocke en `varchar` (et non en type enum PostgreSQL) : une nature nouvelle
 * (I3 : REGLEMENT_DETTE, I5 : AVENANT_ARRET...) s'ajoute sans migration. Ces
 * valeurs ne sont exposees a aucune app installee.
 */

/** Famille de compte (`ledger_account.kind`). */
export enum LedgerAccountKind {
  Kasiman = 'KASIMAN',
  Client = 'CLIENT',
  Flotte = 'FLOTTE',
  Kasi = 'KASI',
  Caisse = 'CAISSE',
  Passerelle = 'PASSERELLE',
  Tresorerie = 'TRESORERIE',
}

/** Nature d'une ecriture (`ledger_entry.nature`). */
export enum LedgerEntryNature {
  FinCourse = 'FIN_COURSE',
  Annulation = 'ANNULATION',
  Recharge = 'RECHARGE',
  Versement = 'VERSEMENT',
  CarteCadeau = 'CARTE_CADEAU',
  ReglementDette = 'REGLEMENT_DETTE',
  AvenantArret = 'AVENANT_ARRET',
  Correction = 'CORRECTION',
  ContrePassation = 'CONTRE_PASSATION',
  Ouverture = 'OUVERTURE',
}

/** Nature d'une ligne (`ledger_line.nature`). */
export enum LedgerLineNature {
  Prix = 'PRIX',
  Commission = 'COMMISSION',
  PartFlotte = 'PART_FLOTTE',
  Pourboire = 'POURBOIRE',
  FraisAnnulation = 'FRAIS_ANNULATION',
  PartKasimanAnnulation = 'PART_KASIMAN_ANNULATION',
  Attente = 'ATTENTE',
  ArretAjoute = 'ARRET_AJOUTE',
  Impaye = 'IMPAYE',
  Recharge = 'RECHARGE',
  Versement = 'VERSEMENT',
  Reglement = 'REGLEMENT',
  Promotion = 'PROMOTION',
  Correction = 'CORRECTION',
  Ouverture = 'OUVERTURE',
  Arrondi = 'ARRONDI',
  ContrePassation = 'CONTRE_PASSATION',
}
