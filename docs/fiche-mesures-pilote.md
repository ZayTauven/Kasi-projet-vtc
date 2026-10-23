# Fiche de conception : tableau de suivi du pilote (`p3-mesures`)

Point du référentiel : `p3-mesures` (phase 3, porteur `kasi-backend-services`). Il sert
`p3-bilan`, la décision écrite de la suite, appuyée sur les mesures. Reprise BetterSuite
évaluée : `bs-mod-insights`, `bs-act-insights`. Fiche rédigée par la session principale le
21 octobre 2026. Statut : **validée par l'utilisateur le 21 octobre 2026, avec les seuils du §6**.

**Pourquoi maintenant** : le tableau doit exister le premier jour du pilote, sinon ses premières
semaines ne sont pas mesurées. Il se construit à la fin de la phase 2, en local, comme le reste.
Seuls les indicateurs du pilote sont visés ; les tableaux de bord complets restent en phase 4
(`p4-pilotage`).

## 1. Ce que demande la feuille de route

« Courses par semaine, délai d'attribution, taux d'acceptation, annulations, commission espèces
recouvrée, Kasimen actifs d'une semaine sur l'autre. » Repère du bilan : le point mort est autour
de **5 000 courses par mois**. Les seuils de réussite sont à fixer en équipe avant le démarrage
(§6).

## 2. Ce qui existe déjà

**Dans Kasi** :
- `accounting` (admin-api), déjà porté sur PostgreSQL : graphiques des revenus, des courses et des
  inscriptions par jour, semaine, mois ou année (`ChartTimeframe`), et un export. Affichés sur
  l'accueil du panel (`cms/home/overview`) ;
- des sources que les lots de phase 1 et 2 ont rendues exploitables :

| Source | Ce qu'elle donne |
|---|---|
| `request` (`requestTimestamp`, `finishTimestamp`, `status`, `serviceId`, `cancelReasonId`) | Courses commandées, terminées, annulées, expirées, par service |
| `request_activity` (`type`, `createdAt`) | Moment exact de l'attribution (`DriverAccepted`), des annulations, de la fin |
| `dispatch_attempt` (`outcome`, `offeredAt`, `respondedAt`, `wave`) | Sollicitations, refus, sans réponse : seulement en `waves` |
| `unserved_demand` | Demande non servie par zone |
| Grand livre (`ledger_entry`, `ledger_line`, natures `FIN_COURSE`, `REGLEMENT_DETTE`, lignes `COMMISSION`, `REGLEMENT`, `cashCollected`) | Commission des courses en espèces, règlements de dette, encours |
| `feedback` | Notes des clients |

**Dans BetterSuite 5.3.2** (`apps/admin-api/src/app/insights`, environ 260 lignes pour les
modules utiles) :

| Module BetterSuite | Verdict | Pourquoi |
|---|---|---|
| Découpage par période (`insights-helper`, `ChartFilterInput`) | **Ne pas porter** | Fait doublon avec `ChartTimeframe` d'`accounting`. Son SQL est MySQL (`DATE_FORMAT`, `ANY_VALUE`) |
| `taxi-order-insights` | **Ne pas porter** | Graphiques génériques, déjà couverts par `requestChart` |
| `cancel-reason-insights` (popularité des motifs, par type d'utilisateur) | **Porter** | Répond à « annulations : pourquoi ». Petit et direct |
| `drivers-insights.getTopEarningDrivers` | **Porter, adapté** | Classement des Kasimen, par courses terminées et gains, sur la période |
| `drivers-insights.getActiveInactiveDrivers` (vu depuis 30 jours) | **Ne pas porter** | « Actif » doit vouloir dire « a roulé », pas « a ouvert l'app » (§3, indicateur 6) |

Les mesures propres au pilote n'existent ni chez Kasi ni chez BetterSuite : délai
d'attribution, taux d'acceptation, rétention des Kasimen et recouvrement de la commission en
espèces. Elles sont à écrire.

## 3. Les indicateurs

La semaine va du lundi au dimanche, heure de Dakar (`date_trunc('week', …)`, le Sénégal étant à
UTC sans heure d'été). Chaque indicateur est donné par semaine et sur la période, pour tous les
services et par famille : personnes (Kasi Ville) ou colis (Kasi Moto, Kasi Tournée), selon
`service.orderType`.

| # | Indicateur | Définition | Source |
|---|---|---|---|
| 1 | **Courses** | Commandées (`requestTimestamp`), terminées (`WaitingForReview`, `Finished`), annulées par le client ou le Kasiman, expirées sans Kasiman. Projection mensuelle face au point mort de 5 000 | `request` |
| 2 | **Délai d'attribution** | Médiane et 90e centile de `DriverAccepted.createdAt − requestTimestamp`, courses immédiates seulement (pas les réservations) | `request` et `request_activity` |
| 3a | **Taux de service** | Courses attribuées ÷ courses commandées, sans les annulations du client avant attribution. Marche en `legacy` comme en `waves` | `request` et `request_activity` |
| 3b | **Taux d'acceptation des offres** | `accepted` ÷ (`accepted` + `rejected` + `no_answer` + `expired`), et vague moyenne d'attribution | `dispatch_attempt` (**`waves` seulement**) |
| 4 | **Annulations** | Taux client avant attribution, client après attribution, Kasiman ; les 5 motifs les plus fréquents (repris de BetterSuite) | `request`, `request_activity`, `cancel_reason` |
| 5 | **Commission en espèces** | Due : lignes `COMMISSION` des comptes `KASIMAN` sur les fins de course où `cashCollected > 0`. Recouvrée : lignes `REGLEMENT` des écritures `REGLEMENT_DETTE`. **Taux de recouvrement** = recouvrée ÷ due. Encours : somme des soldes négatifs des comptes `KASIMAN`, et nombre de Kasimen bloqués par le plafond | Grand livre, `money_policy` |
| 6 | **Kasimen actifs** | Actifs : au moins une course terminée dans la semaine. Retenus : actifs la semaine S et la semaine S-1, ÷ actifs en S-1. Nouveaux : première course terminée dans la semaine. Classement des 10 premiers (repris de BetterSuite, adapté) | `request` |
| 7 | **Clients** | Actifs (au moins une course terminée), récurrents (au moins 2 sur la période), nouveaux | `request` |
| 8 | **Demande non servie** | Courses expirées sans Kasiman ; alertes de demande non servie et leurs zones | `request`, `unserved_demand` |
| 9 | **Satisfaction** | Note moyenne et part des notes inférieures ou égales à 3 | `feedback` |

Les indicateurs 7 à 9 ne sont pas cités par la feuille de route. Ils sont proposés parce qu'un
bilan de pilote les demandera : vient-on deux fois, où manque-t-il des Kasimen, est-ce bien
servi.

## 4. Conception

**API** (admin-api), dans un module `pilot-insights` :
- `pilotDashboard(from, to)` : un objet qui contient les séries hebdomadaires et les totaux des
  indicateurs 1 à 9 ;
- `pilotCancelReasons(from, to)` et `pilotTopKasimen(from, to)` : portés de BetterSuite ;
- `pilotExport(from, to)` : un fichier CSV par semaine, pour `p3-bilan`, sur le modèle de
  l'export d'`accounting`.

Des requêtes SQL agrégées en lecture seule, sans table ni migration. PostgreSQL renvoie les
`count` et les `sum` en texte : conversion explicite (`::int`, `::float8`), comme dans
`accounting.service.ts`.

**Droits** : permissions existantes, donc sans migration. `Requests_View` pour l'ensemble ;
l'indicateur 5 (argent) exige en plus `ProviderWallet_View`. Sans cette permission, ses champs
valent `null`.

**Panel** : un écran « Pilote » dans l'accueil (`cms/home`), avec un choix de période (par
défaut, depuis le début du pilote) :
- une rangée de chiffres clés (courses de la semaine, délai médian, taux de service, recouvrement,
  Kasimen actifs) ;
- des courbes hebdomadaires ;
- le classement des Kasimen et les motifs d'annulation ;
- le bouton d'export.

Même bibliothèque de graphiques que l'accueil actuel, textes en français et en anglais.

**Date de début du pilote** : paramètre de l'écran (date choisie). On n'ajoute pas de réglage
serveur.

## 5. Tests et découpage

Banc d'intégration : le harnais du banc pilote (`cycle-pilote.int-spec.ts`) produit déjà des
courses réalistes, en espèces, livraisons, refus, annulations et sans Kasiman. Un test les
génère, calcule les indicateurs, et les compare au calcul attendu tenu à côté (comme les
portefeuilles du banc pilote), sur deux semaines pour la rétention.

| Incrément | Contenu | Effort estimé |
|---|---|---|
| M1 | API `pilotDashboard`, motifs et classement repris de BetterSuite, tests | 2 à 3 jours |
| M2 | Écran « Pilote » du panel | 2 jours |
| M3 | Export CSV | 0,5 jour |

## 6. À décider avant le pilote

1. **Seuils de réussite** (`p3-bilan`). **Validés par l'utilisateur le 21 octobre 2026** ;
   l'écran les affiche à côté de chaque indicateur :
   - délai d'attribution médian sous 3 minutes ;
   - taux de service supérieur à 85 % ;
   - rétention hebdomadaire des Kasimen supérieure à 70 % ;
   - recouvrement de la commission en espèces supérieur à 90 % ;
   - au moins 30 % de clients récurrents ;
   - une trajectoire vers le point mort, 5 000 courses par mois, à préciser par l'équipe.
2. **Passage en `waves` avant le début du pilote** : sans lui, pas de taux d'acceptation
   (indicateur 3b). Le runbook le prévoit juste après les essais sur téléphone : il faut le faire
   avant le premier Kasiman recruté.
3. **Suivi des e-commerçants** (`p3-b2b`) : rien dans le modèle n'identifie un compte entreprise
   pour l'instant. Pour le pilote, on propose de les suivre comme des clients par leur numéro,
   avec une liste saisie dans l'écran. Le vrai compte entreprise reste en phase 4.
