# Fiche de conception : grand livre, dette espèces et devis figé (`p2-argent`)

Point du référentiel : `p2-argent` (phase 2, lot `lot-argent`). Règles couvertes :
`dira-r-grandlivre`, `dira-r-dette`, `dira-r-devis`, `dira-r-pourboire`, `dira-r-impaye`,
`dira-r-arret`. Cible : `sc-grandlivre`, `sc-especes`, `sc-prix`. Anomalie : `bug-prix`.
Points voisins : `p2-momo` (Bictorys, hors lot), `p2-dispatch`, `p2-parametrage`,
`d-commission`.

Fiche rédigée par kasi-backend-services le 19 octobre 2026, à partir du code relu ce
jour-là, y compris la phase 1 codée mais non committée (`wallet-ledger.ts`,
`order-transition.ts`, `SharedOrderService.finish`). Aucune base n'a été interrogée.
Statut : **proposition, en attente des décisions de la section 8**.

**En bref**

- Aujourd'hui, l'argent vit dans quatre portefeuilles (Kasiman, client, flotte, Kasi) et
  quatre tables de lignes. Chaque opération touche un seul portefeuille à la fois. Rien
  ne prouve qu'une course laisse des comptes équilibrés.
- La commission d'une course en espèces est **déjà** prélevée sur le portefeuille du
  Kasiman. Un solde négatif est donc une dette de fait. Mais il n'y a ni plafond, ni
  relevé lisible, ni règlement prévu.
- Le prix est recalculé à la commande, avec d'autres règles que l'aperçu. Sept causes
  d'écart sont identifiées (section 2). La plus visible : rider-app affiche le prix avec
  coupon, mais n'envoie pas le coupon à la commande.
- Recommandation : écrire le grand livre **en interne** (rien d'utile à porter de
  BetterSuite pour ce lot). Les portefeuilles deviennent des projections du grand livre.
  Cinq incréments ; les quatre premiers sont nécessaires au pilote.

---

## 1. Inventaire des flux d'argent actuels

Chemins relatifs à `app-kasi/`. « SOS » désigne
`libs/database/src/lib/order/shared-order.service.ts`. Toutes les écritures passent
par `postWalletOperation` (`libs/database/src/lib/order/wallet-ledger.ts`) : verrou
consultatif par portefeuille, clé d'unicité, incrément atomique. Une opération = une
ligne sur **un** portefeuille. Les lignes d'une même course sont dans la même
transaction, mais rien ne vérifie qu'elles s'équilibrent.

Exemple chiffré utilisé dans toute la fiche : course à 2 000 FCFA, commission 15 %
(300 FCFA), flotte à 20 % de la commission (60 FCFA), part Kasi 240 FCFA.

### 1.1 Fin de course (`SOS.finishInTransaction`, lignes 544-760)

Calcul commun (lignes 601-610) :

- `commission = providerSharePercent × costAfterCoupon / 100 + providerShareFlat`. Le
  pourcentage est multiplié par `touristMultiplier` si le client n'est pas résident.
- `unPaidAmount = costAfterCoupon − paidAmount + tipAmount`.
- Le pourboire n'entre pas dans la commission : **confirmé**.

| Cas | Débité | Crédité | Clé | Ce qui manque pour une partie double |
|---|---|---|---|---|
| Espèces. L'app envoie `cashPayment = costAfterCoupon + tipAmount − paidAmount` (`driver-app/lib/order_status_card_view.dart` l. 62-67) | Kasiman −300 (l. 655-667) | Flotte +60 (l. 668-688) ; Kasi +240 (l. 689-699) | `order:<id>:driver-commission`, `:fleet-commission`, `:provider-commission` | Trois opérations sans lien entre elles. Les 2 000 FCFA encaissés n'apparaissent nulle part : le relevé ne peut pas dire « 2 000 encaissés, 300 dus ». |
| Portefeuille client | Client −(2 000 + pourboire) (l. 715-729) ; Kasiman −300 | Kasiman +(2 000 + pourboire) (l. 700-714) ; flotte +60 ; Kasi +240 | `:rider-order-fee`, `:driver-order-fee` + les trois ci-dessus | Équilibré, mais en cinq opérations. Le pourboire est fondu dans la ligne « OrderFee » : il ne se lit pas au relevé. |
| Mixte (une part en espèces) | Client −(dû − espèces) | Kasiman +(prix − espèces + pourboire) | idem | Équilibré tant que les espèces restent sous le prix. Voir A1. |
| Solde insuffisant | Rien | Rien | — | La course passe en `WaitingForPostPay` (l. 637-653) et reste bloquée. C'est l'inverse de `dira-r-impaye`. |
| Préautorisation à capturer | Rien dans la transaction | Rien | — | Capture HTTP hors transaction (l. 520-540), puis nouvelle décision. L'argent capturé n'arrive au client que par le retour de passerelle (1.3). Aucun compte ne trace ce que doit la passerelle. |

En fin de course, `paidAmount` reçoit `costAfterCoupon` (l. 730-734), sans le pourboire.

### 1.2 Annulation et frais

- **Annulation client** (`apps/rider-api/src/app/order/rider-order.service.ts`, `cancelOrder`,
  l. 188-310). Si un Kasiman est attribué et que `cancellationTotalFee > 0` : client
  −`cancellationTotalFee` (l. 238-250), Kasiman +`cancellationDriverShare` (l. 251-263),
  Kasi +(total − part Kasiman) (l. 264-276). Équilibré. Le client peut passer en négatif
  sans règle : c'est déjà une dette client de fait. La ligne du Kasiman est enregistrée en
  `Deduct` / `Commission` avec un montant **positif** : l'app Kasiman affiche un gain sous
  le libellé « Commission ». Capture de préautorisation après coup (l. 290-299).
- **Annulation Kasiman** (`apps/driver-api/src/app/order/order.service.ts` l. 118-147) et
  **opérateur** (`apps/admin-api/src/app/order/order.service.ts` l. 52) : aucun argent. Le
  prix enregistré est remis à 0 (`costAfterCoupon: 0`), comme à l'annulation client
  (l. 215). On perd la trace du prix annoncé.

### 1.3 Recharge par passerelle

- Client : `apps/rider-api/src/app/rider-api.controller.ts` l. 61-107. Client +montant, clé
  `payment:<passerelle>:<référence>`. Puis, si une course attend, `finish` (l. 98-99) ou
  `processPrePay` (l. 104-107). La ligne `payment` est supprimée (l. 92-94).
- Kasiman : `apps/driver-api/src/app/driver-api.controller.ts` l. 43-81. Kasiman +montant,
  même clé.
- Manque : la contrepartie. L'argent est chez la passerelle (demain chez Bictorys) ; aucun
  compte ne le dit. Impossible de rapprocher un relevé de passerelle.

### 1.4 Préautorisation et prépaiement

- `SOS.processPrePay` (l. 430-494) ne bouge aucun argent (le débit est en commentaire,
  l. 354-362).
- **À vérifier** : la condition l. 448-455 lève `Credit is not enough` quand crédit +
  autorisation dépasse le minimum requis de plus de 1 FCFA. Elle semble inversée. Sans
  effet tant qu'aucun service n'a de `prepayPercent`.

### 1.5 Carte cadeau (`apps/rider-api/src/app/coupon/coupon.service.ts`)

- Le dépôt est typé `Repository<GiftCardEntity>` mais injecté avec
  `@InjectRepository(CouponEntity)` (l. 17-18). `GiftCardEntity` n'est pas déclarée dans
  le `TypeOrmModule.forFeature` du module (`coupon.module.ts` l. 18).
- Effet : `findOneBy({ code })` cherche dans la table `coupon`. Un vrai code de carte
  répond « Invalid code ». Un code de **coupon** est trouvé : l'écriture `isUsed: true` vise
  une colonne absente de `coupon`, et le crédit lirait `amount` et `currency`, absents
  aussi. La fonction ne marche dans aucun cas.
- `isUsed`, `availableTimestamp` et `expirationTimestamp` ne sont jamais vérifiés. La clé
  `gift-card:<id>` prendrait l'id du coupon.
- Contrepartie absente : une carte cadeau est une charge commerciale de Kasi.

### 1.6 Coupon de réduction (`libs/coupon/.../common-coupon.service.ts`)

- `applyCouponOnPrice` (l. 17-20) : `prix × (100 − %) / 100 − remise fixe`. Ni arrondi, ni
  plancher à 0 : le prix peut devenir négatif.
- `checkCoupon` (l. 22-49) ne vérifie ni `allowedServices`, ni `minimumCost` /
  `maximumCost`, ni `isFirstTravelOnly`, ni `startAt`.
- Qui paie la remise ? Aujourd'hui, en partie le Kasiman : il reçoit `costAfterCoupon`, et
  la commission baisse dans la même proportion. Aucune ligne « promotion » côté Kasi.

### 1.7 Versements aux Kasimen (`apps/admin-api/src/app/payout/payout.service.ts`)

- Éligibles : portefeuille > 0 (l. 45-80). `processPayout` (l. 138-201) : prise du
  versement par écriture conditionnelle, puis Kasiman −montant avec garde « solde
  suffisant », clé `payout:<id>`.
- Manque : la contrepartie (Wave, Orange Money, virement ou espèces, d'après
  `PayoutMethodType`). La sortie réelle n'est pas tracée.

### 1.8 Opérations manuelles du back-office

- Mutations sur mesure : `createDriverTransaction`
  (`apps/admin-api/src/app/driver/driver.resolver.ts` l. 58-73), `createRiderTransaction`
  (`rider/rider.resolver.ts` l. 27-42), `createFleetTransaction` (`fleet/fleet.resolver.ts`
  l. 21-29). Signe forcé selon `action`, auteur (`operatorId`), clé `operator:<clé>`
  facultative.
- Manques : aucune contrepartie (une « recharge » sort de nulle part) ; motif facultatif ;
  **aucun contrôle de permission** au-delà de `JwtAuthGuard`. Les permissions
  `DriverWallet_Edit`, `RiderWallet_Edit` et `FleetWallet_Edit` existent pourtant
  (`operator-permission.enum.ts` l. 27-34), et `deleteOneDriver`, dans le même fichier,
  vérifie la sienne.
- Mutations CRUD génériques : `createOneDriverTransaction` (`driver/driver.module.ts`
  l. 59-67), `createOneRiderTransaction` (`rider/rider.module.ts` l. 56-63, sans
  `CreateDTOClass` : l'entrée est le DTO entier), `createOneProviderTransaction`
  (`accounting/accounting.module.ts` l. 38-46 ; l'entrée accepte même `createdAt`). Elles
  insèrent une ligne sans toucher au solde ni à la clé.
- **Vérifié** : aucun fichier de l'admin-panel, des deux apps ni de `tools/` n'appelle
  ces trois mutations génériques. L'admin-panel n'appelle que `createDriverTransaction`,
  `createRiderTransaction` et `createFleetTransaction` (`driver-profile.graphql` l. 182,
  `rider-view.graphql` l. 115, `fleet-view.graphql` l. 87). La création générique des
  lignes de flotte est déjà désactivée (`fleet/fleet.module.ts` l. 54). Dans driver-api et
  rider-api, la création est désactivée partout.

### 1.9 Part de flotte

- Créditée à la fin de course (SOS l. 668-688) :
  `commission × commissionSharePercent / 100 + commissionShareFlat`.
- Sur une course en espèces, Kasi crédite la flotte avec de l'argent qu'il n'a pas encore
  reçu : il lui avance sa part de la dette du Kasiman (voir 4.5).

### 1.10 Affichages dérivés

- Gains de l'app Kasiman (`apps/driver-api/src/app/wallet/earnings.service.ts` l. 10-14) :
  `SUM(costBest − providerShare)`. Or `providerShare` est figé à la commande, sur le prix
  avant coupon et sans multiplicateur touriste (SOS l. 387-388). Les gains affichés
  diffèrent donc des mouvements réels.
- Graphiques comptables d'admin-api (`apps/admin-api/src/app/accounting/accounting.service.ts`) :
  sommes sur `admin_transaction`, déjà en SQL PostgreSQL.

### 1.11 Anomalies relevées pendant l'inventaire (à corriger dans ce lot)

| N° | Anomalie | Où | Effet |
|---|---|---|---|
| A1 | Pourboire perdu quand les espèces couvrent exactement le prix | SOS l. 700 (`costAfterCoupon − cashAmount > 0`) et l. 715 | Client débité du pourboire, Kasiman jamais crédité : l'argent disparaît. |
| A2 | Pourboire négatif accepté, à n'importe quel statut | `apps/rider-api/src/app/order/dto/update-order.input.ts` ; `rider-order.query-service.ts` l. 72 | Un client saisit −1 500 : l'app Kasiman réclame 1 500 FCFA de moins, la commission reste due sur le prix plein. |
| A3 | Attente et coupon modifiables après paiement | `rider-order.query-service.ts` l. 50-72 | Le prix enregistré change après coup, sans mouvement d'argent. |
| A4 | Service « espèces seulement » payé par le portefeuille | SOS l. 588-616 | Si le client a du crédit, il est débité même sur `OnlyCash`. |
| A5 | Montant espèces fourni par l'app | driver-api `updateOneOrder`, champ `paidAmount` | Le serveur croit le chiffre envoyé. |
| A6 | Soldes en `float`, lignes en `numeric(10,2)`, aucun arrondi au franc | `*-wallet.entity.ts` (`'float'`) | 15 % de 1 250 FCFA donnent 187,5 FCFA. Le FCFA n'a pas de centimes. |
| A7 | Part d'annulation du Kasiman typée « Commission » | `rider-order.service.ts` l. 251-263 | L'app Kasiman présente un gain comme une commission. |
| A8 | Carte cadeau inopérante | 1.5 | Fonction morte, et dangereuse si on la répare sans vérifier `isUsed`. |
| A9 | Opérations manuelles sans permission dédiée ; mutations génériques ouvertes | 1.8 | Tout opérateur connecté peut créditer un portefeuille. |
| A10 | Condition de prépaiement probablement inversée | SOS l. 448-455 | Sans effet tant qu'aucun service n'exige de prépaiement. |

---

## 2. Où se calcule le prix, et pourquoi il change (`bug-prix`)

### 2.1 Le parcours actuel

1. **Aperçu**. rider-app appelle la requête `getFare` (`rider-app/lib/main/order.graphql`
   l. 240-283) avec `points`, `couponCode` et `selectedOptionIds`. Résolveur :
   `apps/rider-api/src/app/order/order.resolver.ts` l. 66-82, puis `SOS.calculateFare`
   (l. 108-218). L'app affiche `cost` et `costAfterCoupon`
   (`rider-app/lib/main/service_item_view.dart` l. 95-108). Rien n'est conservé.
2. **Commande**. Mutation `createOrder` (`order.resolver.ts` l. 84-95), puis
   `SOS.createOrder` (l. 220-428). Tout est recalculé : itinéraire (l. 286-289), coût
   (l. 303-311), forfait de zone (l. 312-333), puis coupon (l. 395-401). Le résultat va
   dans `costBest` et `costAfterCoupon`.
3. **Pendant la course**. Le client peut modifier `waitMinutes` et `couponCode`
   (`rider-order.query-service.ts` l. 50-72) : le prix est réécrit.
4. **Fin de course**. `finish` lit `costAfterCoupon` tel quel (SOS l. 601-610).

La formule de base est `ServiceService.calculateCost`
(`libs/database/src/lib/order/service.service.ts` l. 23-100) : prise en charge + distance
+ durée, multiplicateurs (distance, heure, jour, période, flotte), minimum, multiplicateur
touriste, puis arrondi `roundingFactor`.

### 2.2 Les causes exactes de l'écart

| N° | Cause | Code | Sens de l'écart |
|---|---|---|---|
| C1 | **Le coupon est affiché mais pas envoyé.** `Input$CreateOrderInput` ne contient pas `couponCode` (`rider-app/lib/main/select_service_view.dart` l. 139-160 et 196-216), alors que l'aperçu l'a appliqué. | rider-app | Enregistré > affiché |
| C2 | **Les options payantes sont ignorées à l'aperçu.** `getFare` reçoit `selectedOptionIds`, mais `calculateFare` ne les lit pas. `createOrder` ajoute `optionFee` (l. 262-285, 311). rider-app ne les ajoute pas à l'affichage. | SOS | Enregistré > affiché |
| C3 | **Le forfait de zone est traité autrement.** À la commande, le forfait écrase le coût et **efface les options** (l. 319). Les multiplicateurs horaires lus sont ceux de `zonePricings[0]`, pas du forfait retenu (l. 321). L'aperçu ne teste que `zonePricings[0]` (l. 172-176). Aucun arrondi après ces multiplicateurs. | SOS | Variable |
| C4 | **L'itinéraire est recalculé.** Deux appels à `RoutingService.getSumDistanceAndDuration`. Trafic, variante de route ou bascule de fournisseur (Mapbox, puis OSRM, puis vol d'oiseau × 1,3 : `routing/routing.service.ts` l. 136-170) donnent deux distances. | SOS + routage | Variable |
| C5 | **L'heure diffère.** L'aperçu prend `new Date()` (l. 167). La commande prend l'heure prévue pour les multiplicateurs du service (l. 290-311), mais `new Date()` pour ceux du forfait (l. 320). Une réservation est affichée au tarif de l'instant. Un changement de tranche horaire entre aperçu et commande change le prix. | SOS | Variable |
| C6 | **La mutation `calculateFare` de rider-api ne passe ni client ni coupon** (`order.resolver.ts` l. 57-64) : le statut de résident est ignoré. rider-app utilise `getFare`, mais la mutation reste exposée. | rider-api | Variable |
| C7 | **Le prix change après la commande** : attente et coupon modifiables à tout moment, y compris après paiement (A3) ; annulation qui remet le prix à 0 (1.2). | rider-api | Variable |

Conclusion : `bug-prix` ne se corrige pas en rapiéçant `createOrder`. Il faut **un seul
calcul**, fait une fois, conservé, puis consommé (section 5).

---

## 3. Modèle de grand livre proposé (`dira-r-grandlivre`, `sc-grandlivre`)

### 3.1 Principes

1. Chaque mouvement d'argent est une **écriture** : une référence (clé d'unicité), un
   motif, un auteur, une date, et au moins deux **lignes** dont la somme vaut zéro.
2. Une écriture ne se modifie jamais et ne se supprime jamais. On corrige par une
   écriture inverse (contre-passation) qui cite l'écriture corrigée.
3. Les portefeuilles actuels deviennent des **projections** : leur solde est, à tout
   instant, la somme des lignes de leur compte. Ils sont mis à jour dans la même
   transaction que l'écriture, par un seul chemin de code.
4. Une seule devise par écriture. Les montants sont des entiers en FCFA (XOF n'a pas de
   subdivision : exposant ISO 4217 égal à 0).

### 3.2 Les comptes

Convention de signe, choisie pour coller aux portefeuilles : **montant positif = le
compte reçoit**. Pour un compte de tiers (Kasiman, client, flotte), le solde est ce que
Kasi lui doit ; s'il est négatif, c'est sa dette. Pour les comptes de trésorerie de Kasi
(caisse, passerelle, banque), un solde négatif signifie que Kasi détient l'argent. L'export
comptable inverse le signe et présente débit et crédit.

| Compte | Code | Projection | Rôle |
|---|---|---|---|
| Kasiman | `KASIMAN:<driverId>` | `driver_wallet` | Gains, commission due, dette espèces, versements. Un seul compte par Kasiman : les gains payés en ligne compensent la dette. |
| Client | `CLIENT:<riderId>` | `rider_wallet` | Crédit prépayé ; négatif = impayé. |
| Flotte | `FLOTTE:<fleetId>` | `fleet_wallet` | Part de commission de la flotte. |
| Produits Kasi | `KASI:PRODUITS` | `admin_wallet` | Commissions et frais d'annulation (la nature de la ligne les distingue). |
| Promotions | `KASI:PROMOTIONS` | aucune | Cartes cadeaux, coupons si Kasi les finance (question 8.6). |
| Corrections | `KASI:CORRECTIONS` | aucune | Gestes commerciaux, régularisations manuelles. |
| Ouverture | `KASI:OUVERTURE` | aucune | Contrepartie des soldes repris (3.8). |
| Arrondis | `KASI:ARRONDIS` | aucune | Écarts d'arrondi de la reprise. |
| Caisse | `CAISSE:<lieu>` | aucune | Espèces reçues par Kasi : règlement de dette au guichet, recharge en espèces. |
| Passerelle | `PASSERELLE:<gatewayId>` | aucune | Argent encaissé par une passerelle et pas encore reversé (Bictorys demain). |
| Trésorerie | `TRESORERIE:<WAVE, ORANGE_MONEY ou BANQUE>` | aucune | Sorties réelles : versements aux Kasimen et aux flottes. |
| Attente flotte | `FLOTTE_ATTENTE:<fleetId>` | aucune | Seulement si l'option B de 4.5 est retenue. |

Les comptes sont créés au premier mouvement, comme les portefeuilles aujourd'hui.

### 3.3 Tables (migration additive)

- `ledger_account` : `id`, `code` (unique, ex. `KASIMAN:12`), `kind` (KASIMAN, CLIENT,
  FLOTTE, KASI, CAISSE, PASSERELLE, TRESORERIE), `ownerId` (nullable), `currency`
  char(3), `createdAt`.
- `ledger_entry` : `id` ; `idempotencyKey` varchar(128), **non nul et unique** ; `nature`
  (FIN_COURSE, ANNULATION, RECHARGE, VERSEMENT, CARTE_CADEAU, REGLEMENT_DETTE,
  AVENANT_ARRET, CORRECTION, CONTRE_PASSATION, OUVERTURE) ; `currency` ; `requestId`
  (nullable) ; `operatorId` (nullable) ; `reference` (référence externe : passerelle, reçu
  de caisse) ; `motif` (obligatoire pour une opération manuelle) ; `reversesEntryId`
  (nullable) ; `cashCollected` (entier nullable : espèces encaissées par le Kasiman, pour
  le relevé) ; `createdAt`.
- `ledger_line` : `id`, `entryId`, `accountId`, `amount` **bigint** signé, `nature` de
  ligne (PRIX, COMMISSION, PART_FLOTTE, POURBOIRE, FRAIS_ANNULATION,
  PART_KASIMAN_ANNULATION, ATTENTE, ARRET_AJOUTE, IMPAYE, RECHARGE, VERSEMENT, REGLEMENT,
  PROMOTION, ARRONDI…).
- Colonne `ledgerEntryId` (nullable, indexée) ajoutée aux 4 tables de lignes de
  portefeuille, pour relier l'historique lu par les apps à l'écriture.

Garde-fous **dans la base**, pas seulement dans le code :

- un déclencheur de contrainte `DEFERRABLE INITIALLY DEFERRED` sur `ledger_line` : à la
  validation de la transaction, chaque écriture touchée doit sommer à zéro, sinon la
  transaction échoue ;
- un déclencheur `BEFORE UPDATE OR DELETE` sur `ledger_entry` et `ledger_line`, qui refuse ;
- `migration:generate` ne produit pas les déclencheurs : ils sont écrits à la main dans
  la migration, avec leur `down`.

### 3.4 Écritures types

| Écriture (clé) | Lignes (exemple : 2 000 FCFA, 15 %, flotte 20 %) |
|---|---|
| Course en espèces (`order:<id>:finish`) | KASIMAN −300 (COMMISSION) ; KASI:PRODUITS +240 ; FLOTTE +60. `cashCollected` = 2 000 (+ pourboire déclaré). |
| Course au portefeuille, pourboire 200 | CLIENT −2 200 ; KASIMAN +2 000 (PRIX) ; KASIMAN +200 (POURBOIRE) ; KASIMAN −300 ; KASI:PRODUITS +240 ; FLOTTE +60. |
| Course mixte (500 en espèces) | CLIENT −1 500 ; KASIMAN +1 500 (PRIX) ; KASIMAN −300 ; KASI:PRODUITS +240 ; FLOTTE +60. `cashCollected` = 500. |
| Frais d'annulation 500, part Kasiman 300 (`order:<id>:cancel-fee`) | CLIENT −500 ; KASIMAN +300 (PART_KASIMAN_ANNULATION) ; KASI:PRODUITS +200. |
| Recharge client de 5 000 par passerelle (`payment:<gw>:<réf>`) | PASSERELLE −5 000 ; CLIENT +5 000. |
| Règlement de dette au guichet, 3 000 (`debt-settlement:<clé>`) | CAISSE:SIEGE −3 000 ; KASIMAN +3 000. Motif, numéro de reçu, opérateur. |
| Versement Wave de 10 000 (`payout:<id>`) | KASIMAN −10 000 ; TRESORERIE:WAVE +10 000. |
| Carte cadeau de 2 000 (`gift-card:<id>`) | KASI:PROMOTIONS −2 000 ; CLIENT +2 000. |
| Correction manuelle (`operator:<clé>`) | Compte visé, plus ou moins ; contrepartie choisie par l'opérateur (CAISSE, CORRECTIONS ou PROMOTIONS). |
| Contre-passation (`reversal:<entryId>`) | Lignes inverses de l'écriture citée. |
| Impayé client (`order:<id>:finish`) | Comme la course au portefeuille ; le client passe en négatif. La part non couverte porte la nature IMPAYE. |

Une fin de course devient **une** écriture au lieu de cinq opérations séparées.

### 3.5 Arrondis (le FCFA n'a pas de centimes)

- Prix du devis : arrondi `roundingFactor` du service, puis arrondi final au franc. Il
  s'applique **après** forfait de zone, multiplicateurs et options (corrige une partie de
  C3). Pour l'espèce, un `roundingFactor` de 25 ou 50 FCFA facilite le rendu de monnaie :
  à fixer dans `p2-parametrage`.
- Commission : arrondie au franc le plus proche (demi vers le haut). Part de flotte :
  arrondie au franc. **Part Kasi = commission − part de flotte**, par différence.
  L'écriture reste toujours équilibrée, sans ligne d'arrondi.
- Coupon : remise arrondie au franc ; le prix ne descend jamais sous 0 ni sous le minimum
  du service.
- Effet visible : une commission de 187,5 devient 188. C'est un changement de
  comportement, minime, à annoncer aux Kasimen.

### 3.6 Lien avec `idempotencyKey` (phase 1)

- La clé de l'écriture reprend les formats de `MoneyKey` (`wallet-ledger.ts` l. 132-144),
  au niveau de l'opération entière : `order:<id>:finish`, `order:<id>:cancel-fee`,
  `payment:<gw>:<réf>`, `payout:<id>`, `gift-card:<id>`, `operator:<clé>`. Nouveaux
  formats : `debt-settlement:<clé>`, `order:<id>:stop:<n>`, `reversal:<id>`,
  `opening:<compte>`.
- Insertion en `ON CONFLICT DO NOTHING` : un rejeu ne crée ni écriture ni ligne, et ne
  touche aucun solde.
- Les lignes de portefeuille gardent leurs clés actuelles (`order:<id>:driver-commission`…).
  Un rejeu est absorbé aux deux niveaux.
- Opération manuelle sans clé fournie : le serveur génère `operator-auto:<uuid>`. La clé
  reste non nulle ; le comportement historique (chaque appel compte) est conservé.

### 3.7 Cohabitation avec les tables actuelles

- Un seul point d'entrée, `postLedgerEntry(manager, entry)`, dans `libs/database`. Il
  insère l'écriture et ses lignes. Pour chaque ligne sur un compte projeté, il appelle
  `postWalletOperation` dans la **même** transaction. La ligne de portefeuille garde les
  types d'aujourd'hui (`Commission`, `OrderFee`…) pour que les apps installées continuent
  d'afficher leur historique.
- Plus aucun code n'appelle `rechargeWallet` ou `postWalletOperation` directement. Les
  9 sites recensés (fin de course, annulation, deux retours de passerelle, carte cadeau,
  versement, trois opérations manuelles) passent par `postLedgerEntry`. Un test vérifie
  qu'aucun autre appel n'existe.
- **Mode de bascule**, parce qu'il n'y a pas de staging : variable `LEDGER_MODE`.
  - `shadow` : le grand livre est écrit derrière un point de sauvegarde (`SAVEPOINT`). Une
    erreur du grand livre est journalisée et n'empêche pas la fin de course.
  - `strict` : le grand livre fait foi ; une écriture refusée annule l'opération.
  - Recommandation : deux semaines en `shadow`, avec un balayage d'intégrité quotidien à
    zéro écart, puis `strict`.

### 3.8 Reprise de l'existant (ouverture du grand livre)

1. **Mesure en lecture seule** sur la production (requêtes `SELECT` fournies, lancées par
   l'utilisateur) : nombre de portefeuilles par table et par devise, soldes négatifs,
   soldes non entiers, total par devise, lignes de `admin_wallet`.
2. **Migration** : tables vides et déclencheurs.
3. **Commande ponctuelle `ledger:open`**, livrée dans l'image `migrate` comme
   `mark-baseline`. Lancée les trois API arrêtées (environ une minute), sous verrou
   consultatif. Pour chaque portefeuille, une écriture `OUVERTURE` : le compte reçoit le
   solde arrondi au franc, `KASI:OUVERTURE` l'opposé. L'écart d'arrondi (moins de 1 FCFA
   par portefeuille) va sur `KASI:ARRONDIS`, et le portefeuille est aligné sur l'entier.
   Clé `opening:<compte>` : relancer la commande ne fait rien.
4. L'historique d'avant l'ouverture n'est **pas** reconstitué. Le relevé antérieur reste
   celui des tables actuelles.

Prérequis : `p1-migrations` appliqué en production et la phase 1 déployée.

### 3.9 Contrôle d'intégrité des soldes

| Contrôle | Où | Fréquence |
|---|---|---|
| Écriture équilibrée | Déclencheur différé (3.3) | Chaque transaction |
| Écriture immuable | Déclencheur (3.3) | Chaque transaction |
| Projection = somme des lignes, pour chaque portefeuille | Requête SQL de balayage | Tâche planifiée quotidienne, et à la demande |
| Aucune ligne de portefeuille sans écriture depuis l'ouverture | Requête SQL (`ledgerEntryId IS NULL`, date postérieure à l'ouverture) | Quotidienne |
| Somme de tous les comptes nulle, par devise | Requête SQL | Quotidienne |

Sortie : requête `ledgerIntegrityReport` dans admin-api, alerte dans le journal
d'erreurs (puis GlitchTip quand `p1-sentry` sera branché), pastille rouge dans le panel.
Un écart ne se corrige jamais en touchant un solde : il se corrige par une écriture
motivée.

### 3.10 Prêt pour Bictorys (`p2-momo`, hors lot)

- Le retour Bictorys écrira `PASSERELLE:<bictorys> −x / CLIENT +x`, ou `KASIMAN +x` pour
  une recharge du Kasiman (qui règle sa dette), clé `payment:<gw>:<référence Bictorys>`.
- Les versements Wave et Orange Money écriront `KASIMAN −x / TRESORERIE:WAVE +x`, clé
  `payout:<id>`.
- Le rapprochement avec le relevé Bictorys compare le solde de `PASSERELLE:<bictorys>` aux
  reversements reçus.
- Rien d'autre à prévoir côté grand livre. La fiche de l'auditeur d'intégrations reste un
  préalable à `p2-momo`.

### 3.11 Porter BetterSuite ou écrire en interne

Lu dans BetterSuite 5.3.2 (lecture seule) :

- `apps/admin-api/src/app/accounting/accounting.service.ts` (314 lignes) : graphiques,
  `totalRevenue`, `totaloutstandingUserBalances`, `totalExpenses`, `exportTable`. C'est du
  reporting sur des soldes, en SQL MySQL. `exportTable` ouvre un dépôt à partir d'un nom
  de table reçu en entrée, et son filtre est cassé (le `map` ne renvoie rien).
- `libs/database/src/lib/customer-wallet/shared-customer-wallet.service.ts` : lecture du
  solde puis écriture, sans verrou ni clé. C'est le défaut que `p1-unicite` vient de
  corriger chez Kasi.
- Ni partie double, ni dette espèces, ni plafond, ni devis.

**Recommandation : écrire le grand livre en interne.** Rien n'est à porter dans ce lot.
Les ajouts de reporting (revenus, charges, encours, export CSV) se porteront plus tard
(`p4-pilotage`, skill `kasi-portage-bettersuite`), réécrits sur le grand livre. C'est
déjà la ligne de `bs-mod-accounting` et du skill.

---

## 4. Dette espèces et plafond (`dira-r-dette`, `sc-especes`)

### 4.1 Définition

- **Dette du Kasiman** = la partie négative du solde de son compte, dans la devise de la
  région (XOF à Dakar). Un seul compte : les gains des courses payées en ligne la
  réduisent d'eux-mêmes.
- **Plafond** : au-delà, le Kasiman ne reçoit plus de courses. **Seuil d'alerte** : il est
  prévenu avant d'être bloqué.
- Les deux montants vivent dans une table `money_policy` (une ligne par devise : plafond,
  seuil d'alerte, auteur et date de la dernière modification), modifiable depuis le panel.
  Une dérogation par Kasiman (colonne nullable `driver.debtLimitOverride`) est possible,
  mais pas nécessaire au pilote.
- Une course en cours n'est **jamais** interrompue. Le blocage joue sur la course
  suivante.

### 4.2 Où le blocage s'applique dans le dispatch actuel

Une seule fonction, `isBlockedForDebt(driverId, currency)`, dans `libs/database`, lue
par quatre endroits :

| Endroit | Code | Ce qui change |
|---|---|---|
| Choix des Kasimen prévenus d'une offre | `SharedDriverService.getOnlineDriversWithServiceId` (`libs/database/src/lib/order/shared-driver.service.ts` l. 51-88), appelé par `createOrder` (SOS l. 255-261, push et abonnement l. 419-426), `processPrePay` (l. 477-489) et la relance du cron (`apps/driver-api/src/app/order/cron-job.service.ts` l. 75) | Jointure sur `driver_wallet` : un Kasiman au-delà du plafond n'est ni notifié ni inscrit dans `driverIds`. |
| Offres en attente lues dans Redis | `OrderService.getOrdersForDriver` (`apps/driver-api/src/app/order/order.service.ts` l. 224-280), utilisé par `availableOrders` et `updateDriversLocationNew` | Liste vide pour un Kasiman bloqué. |
| Acceptation | `DriverOrderQueryService.accept` (`apps/driver-api/src/app/order/driver-order.query-service.ts` l. 117-189) | Contrôle dans la transaction, avant l'écriture conditionnelle. C'est le seul contrôle qui fait foi : les deux premiers ne sont que des filtres. |
| Attribution par l'opérateur | `SOS.assignOrderToDriver` (l. 772) | Permise (choix humain), avec la dette affichée dans le panel. |

Messages pour les apps installées :

- driver-app affiche tel quel le message d'erreur GraphQL, sauf s'il contient
  « forbidden » ou « unauthorized » (`driver-app/lib/query_result_view.dart` l. 70-85). Le
  refus d'acceptation porte donc une phrase française lisible, par exemple « Votre solde
  Kasi est de −12 300 FCFA, au-delà du plafond de 10 000 FCFA. Réglez votre dette pour
  recevoir de nouvelles courses. » Le code stable `KASIMAN_DEBT_LIMIT` va dans
  `extensions.code`, pour les prochaines versions de l'app.
- Une app installée voit simplement disparaître les offres. Le seul canal pour expliquer,
  c'est la notification push. Les push actuelles utilisent des clés de traduction de l'app
  (`titleLocKey`, `driver-notification.service.ts` l. 23-24) : une clé nouvelle serait
  inconnue des apps installées. Les push « seuil d'alerte atteint » et « courses
  suspendues » partent donc en texte français direct (`title` / `body`), comme la push de
  message (l. 70-71).

### 4.3 Branchement sur `p2-dispatch`

Le dispatcher par vagues porté de BetterSuite construit une liste de candidats à chaque
vague. Il appellera la même fonction `isBlockedForDebt` pour filtrer ses candidats. Le
contrôle à l'acceptation reste en place quel que soit le dispatcher. Rien d'autre à
prévoir : la règle reste dans `libs/database`, pas dans le dispatcher.

### 4.4 Règlement de la dette

| Moment | Comment le Kasiman paie | Écriture |
|---|---|---|
| Avant `p2-momo` (pilote) | Espèces déposées au siège ou chez un relais Kasi, contre reçu. L'opérateur saisit un « règlement de dette » dans le panel (nouvelle mutation `settleDriverDebt` : Kasiman, montant, lieu, numéro de reçu, clé). | CAISSE:<lieu> −x ; KASIMAN +x |
| À tout moment | Compensation : une course payée en ligne crédite son compte et réduit la dette. | Celle de la course |
| Après `p2-momo` | Bouton existant « Ajouter du crédit » de driver-app (`topUpWallet`), par Wave ou Orange Money via Bictorys. Aucun changement d'app pour le paiement lui-même. | PASSERELLE −x ; KASIMAN +x |

Le déblocage est immédiat : la vérification lit le solde à chaque offre. Les versements
restent réservés aux soldes positifs (déjà le cas, 1.7).

### 4.5 Le cas de la flotte (`commissionSharePercent`)

Aujourd'hui, la flotte reçoit sa part à la fin de chaque course, espèces comprises : Kasi
lui avance de l'argent qu'il n'a pas encore reçu. Trois options :

| Option | Qui porte la dette | Effet |
|---|---|---|
| A. Kasiman débiteur, flotte payée tout de suite (comportement actuel) | Le Kasiman ; Kasi avance la part de la flotte | Rien à changer côté flotte. Risque de Kasi borné : plafond × part de flotte, par Kasiman. |
| B. Kasiman débiteur, flotte payée à l'encaissement | Le Kasiman | Sur une course en espèces, la part de flotte va sur `FLOTTE_ATTENTE`. Chaque règlement libère la part correspondante. Plus juste, mais plus de code et de tests. |
| C. Flotte garante | La flotte : la dette de ses Kasimen s'impute sur son compte, le plafond s'applique à la flotte | Correspond au patron de taxis qui encaisse déjà ses chauffeurs. Demande un contrat avec chaque flotte et un écran de suivi pour elle. |

Recommandation : **A pour le pilote**, avec un plafond bas, qui borne le risque. B ou C
au bilan du pilote, selon les flottes réellement recrutées.

---

## 5. Devis figé (`dira-r-devis`, `sc-prix`, `bug-prix`)

### 5.1 Un seul calcul

Un service `FareQuoteService` dans `libs/database` remplace les deux calculs actuels.
`getFare`, la mutation `calculateFare` (rider-api et dispatcher d'admin-api),
`createOrder` et les avenants passent tous par lui. Il prend : points, service, options,
coupon, client (statut de résident), heure de prise en charge, aller-retour. Il rend un
détail chiffré et un total entier en FCFA. Il corrige d'un coup C2, C3, C5 et C6.

### 5.2 L'entité `fare_quote`

| Champ | Rôle |
|---|---|
| `id` (uuid) | Identifiant renvoyé à l'app |
| `riderId` (nullable : `getFare` accepte un visiteur), `serviceId`, `currency` | |
| `points` (MultiPoint 4326), `pointsHash` | Retrouver le devis d'une app qui n'envoie pas l'identifiant |
| `optionIds`, `couponId`, `twoWay`, `pickupAt` | Ce qui a servi au calcul |
| `distance`, `duration`, `routingSource` (`mapbox`, `google`, `osrm`, `zone`) | Traçabilité de l'itinéraire |
| `breakdown` (jsonb) | Prise en charge, distance, durée, multiplicateurs, options, forfait, coupon, arrondi |
| `totalBeforeCoupon`, `total` (entiers) | Prix affiché |
| `createdAt`, `expiresAt` (création + 120 s, paramétrable) | Validité |
| `consumedAt`, `requestId` (unique) | Un devis ne sert qu'à une commande |
| `kind` (`initial`, `avenant`), `parentQuoteId` | Arrêt ajouté (5.5) |

Plus une colonne `request.quoteId` (nullable). `costBest` et `costAfterCoupon` restent
remplies à partir du devis : les apps installées les lisent.

Volume : un devis par service et par aperçu. Purge quotidienne des devis non consommés de
plus de 24 heures. Le stockage en PostgreSQL, plutôt qu'en Redis, rend la consommation
atomique et testable sur le banc :
`UPDATE fare_quote SET "consumedAt" = now(), "requestId" = $1 WHERE id = $2 AND "consumedAt" IS NULL AND "expiresAt" > now()`.

### 5.3 Validité et apps installées

| App | Ce qu'elle envoie | Traitement |
|---|---|---|
| Nouvelle rider-app | `quoteId` (nouveau champ facultatif de `CreateOrderInput`) | Devis valide : consommé, prix garanti. Expiré : refus avec un message lisible (« Le prix a changé, nous l'avons recalculé ») et le code `QUOTE_EXPIRED` ; l'app relance `getFare`. |
| rider-app installée | Rien | Le serveur cherche le dernier devis non consommé du même client, même service, mêmes points (coordonnées arrondies à 6 décimales) et mêmes options. Trouvé : il est consommé, **coupon compris** (C1 corrigé sans mise à jour de l'app). Pas trouvé : nouveau devis calculé à la commande, comme aujourd'hui, et compté dans une mesure « devis recalculé ». |
| Back-office (dispatcher) | Rien | Nouveau devis à la commande. Le panel affiche le prix du devis. |

Pour une app installée, faut-il honorer un devis retrouvé au-delà de 2 minutes ? Le
client a vu ce prix. Recommandation : jusqu'à 10 minutes pour les apps sans `quoteId`
(on respecte le prix affiché), 2 minutes strictes pour les apps qui savent rafraîchir
(question 8.7).

### 5.4 Refus si la cartographie manque

- Si l'itinéraire vient de l'estimation à vol d'oiseau, ou si tous les fournisseurs
  échouent, **et** si le prix dépend de la distance ou de la durée : pas de devis. `getFare`
  et `createOrder` répondent « Impossible de calculer l'itinéraire pour le moment.
  Réessayez dans un instant. » rider-app affiche ce message avec « Réessayer »
  (`service_selection_card_view.dart` l. 77-82, `query_result_view.dart`).
- OSRM reste accepté : c'est un vrai calcul routier. Il est tracé dans `routingSource`.
- Un forfait de zone n'a pas besoin d'itinéraire : le devis est accordé. Avec la grille de
  1 000 à 3 000 FCFA par zone prévue pour Dakar (`p2-parametrage`), c'est le cas courant.
- Cela contredit l'invariant écrit dans `routing.service.ts` (l. 22-24 : « un devis doit
  toujours être calculable, quitte à dégrader »). Décision à journaliser : le routage
  continue de ne jamais lever d'erreur, il indique sa source, et c'est le devis qui refuse
  une estimation.

### 5.5 Après la commande : attente, coupon, pourboire, arrêt ajouté, impayé

| Changement | Règle proposée |
|---|---|
| Temps d'attente (`waitMinutes`) | Permis jusqu'au démarrage. Recalcul par `FareQuoteService` avec arrondi. Refusé après (corrige A3). |
| Coupon après commande | Permis jusqu'au démarrage, avec toutes les règles du coupon (1.6). Refusé après. |
| Pourboire (`dira-r-pourboire`) | Entier, positif, plafonné (par exemple 5 000 FCFA), permis jusqu'au paiement. Jamais commissionné. Ligne POURBOIRE distincte au relevé, y compris quand les espèces couvrent le prix (corrige A1, A2). |
| Arrêt ajouté (`dira-r-arret`) | Nouvelle mutation rider-api `addStop` (course acceptée ou démarrée). Devis d'avenant sur l'itinéraire complet ; écart = nouveau total − ancien, jamais négatif. Le total de la course est mis à jour ; l'écart est payé avec la course (espèces ou portefeuille) et la commission porte sur le nouveau total. L'écart est inscrit au relevé du Kasiman (« Arrêt ajouté : +400 FCFA ») et notifié aux deux apps. Clé `order:<id>:stop:<n>`. |
| Impayé (`dira-r-impaye`) | Course payée par le portefeuille et solde insuffisant : la course se termine (fini le blocage en `WaitingForPostPay`). Le client passe en négatif, le Kasiman est crédité en entier. La prochaine recharge solde la dette. Tant que le solde est négatif, une nouvelle commande n'est permise qu'en espèces (question 8.8). Sur un service qui accepte l'espèce, le parcours actuel reste : le Kasiman encaisse le reste en espèces. |
| Montant espèces | Calculé par le serveur à partir du devis. Le chiffre envoyé par l'app est gardé pour contrôle et journalisé s'il diffère (corrige A5). |
| Service `OnlyCash` | Le portefeuille n'est jamais débité (corrige A4). |
| Annulation | `costAfterCoupon` reste remis à 0, car les apps l'affichent ainsi. Le devis, lui, garde le prix annoncé. |

Avant `p2-momo`, le paiement par portefeuille est rare : l'impayé est surtout une
préparation à Bictorys.

---

## 6. Contrat mobile (skill `kasi-contrat-mobile-backend`)

Règle : tout changement d'API est un **ajout facultatif**. Aucune valeur n'est ajoutée
aux énumérations déjà lues par les apps (`DriverDeductTransactionType`,
`DriverRechargeTransactionType`…). Les apps générées ont un cas `$unknown` (vérifié dans
`driver-app/lib/wallet/wallet_view.dart` l. 118 et 136), mais un libellé « inconnu » dans
le portefeuille d'un Kasiman n'est pas acceptable. La nature précise d'une opération passe
par de nouveaux champs et de nouvelles requêtes.

### 6.1 rider-api (rider-app)

| Changement | Type | App installée |
|---|---|---|
| `getFare` : champs `quoteId` et `quoteExpiresAt` (nullables) sur chaque service | Ajout | Ignorés |
| `CreateOrderInput.quoteId` (facultatif) | Ajout | Devis retrouvé par le serveur (5.3) |
| Refus de devis sans itinéraire | Comportement | Message lisible et « Réessayer » |
| `updateOneOrder` : pourboire négatif, attente ou coupon après démarrage refusés | Comportement | Message lisible |
| `redeemGiftCard` fonctionne enfin ; carte déjà utilisée ou expirée refusée | Comportement | Message lisible ; **test sur téléphone obligatoire** |
| Solde négatif possible (impayé) | Comportement | Affichage du solde négatif à vérifier sur téléphone |
| Mutation `addStop` | Ajout | Non visible |

### 6.2 driver-api (driver-app)

| Changement | Type | App installée |
|---|---|---|
| Requête `kasimanAccount` : solde, dette, plafond, seuil, `blocked` | Ajout | Non visible |
| Requête `kasimanStatement` (relevé paginé : course, prix, espèces encaissées, commission, pourboire, arrêt ajouté, règlement) | Ajout | Non visible |
| `availableOrders` vide et acceptation refusée au-delà du plafond | Comportement | Message lisible, push en texte direct |
| Lignes de portefeuille existantes (`driverTransacions`) | Inchangé | Toujours lues. Seule la part d'annulation du Kasiman change de type : `Recharge` / `OrderFee`, valeurs existantes, affichées comme un gain (A7) |
| `paidAmount` (espèces) recalculé côté serveur | Comportement | Transparent |

### 6.3 À faire côté apps (kasi-mobile-apps)

- **driver-app** : écran « Mon relevé » (lignes par course : encaissé, commission,
  pourboire, arrêt ajouté ; règlements ; solde) ; bandeau d'alerte au seuil ; écran de
  blocage avec le montant dû et la marche à suivre ; lecture de `KASIMAN_DEBT_LIMIT` ;
  affichage d'un arrêt ajouté et de l'écart en cours de course.
- **rider-app** : envoi de `quoteId` ; relance de `getFare` sur `QUOTE_EXPIRED` ; envoi du
  coupon à la commande ; affichage des options payantes dans le prix ; écran « Ajouter un
  arrêt » ; affichage d'un solde négatif.
- Validation sur émulateur et sur téléphone réel, avec l'**ancienne** version installée en
  même temps que la nouvelle : les deux doivent marcher contre le même backend.

### 6.4 À faire côté panel (kasi-admin-panel)

- Retrait des trois mutations génériques (aucun appel dans le panel, vérifié en 1.8).
- Fiche Kasiman : dette, plafond, statut bloqué, bouton « Règlement de dette » (montant,
  lieu, reçu), relevé.
- Liste des Kasimen : colonne dette, filtre « bloqués ».
- Réglages : plafond et seuil par devise (`money_policy`).
- Journal du grand livre (filtres : compte, course, nature, opérateur, période) et rapport
  d'intégrité.
- Opérations manuelles : motif obligatoire et contrepartie à choisir. Le panel est déployé
  en même temps que le backend : ce resserrement le concerne seul. L'API garde le champ
  facultatif et refuse côté serveur un motif vide.

---

## 7. Découpage en incréments

Chaque incrément se livre seul : migration additive listée à la main dans
`libs/database/src/lib/migration/index.ts`, tests sur le banc d'intégration
(`npm run test:integration`, `docs/tests-integration.md`) au vert **avant** tout
déploiement, `docker compose run --rm --no-deps migrate` avant `up -d` (déploiement SSH,
pas de staging), et lancement réel sur émulateur et téléphone dès qu'une app est touchée.
Les efforts sont des **estimations**, en jours-développeur.

Préalable, hors lot : phase 1 committée et déployée, `p1-migrations` appliqué en
production.

### I1. Correctifs d'argent rattachés (sans table)

- **Périmètre** : carte cadeau (bon dépôt, `GiftCardEntity` déclarée dans le module,
  `isUsed` / disponibilité / expiration vérifiés sous verrou, clé `gift-card:<id>`) ;
  pourboire (A1, A2) ; attente et coupon gelés après démarrage (A3) ; `OnlyCash` (A4) ;
  part d'annulation du Kasiman enregistrée comme gain (A7 : `Recharge` / `OrderFee`,
  valeurs que l'app installée connaît déjà) ; règles du coupon (1.6) ;
  contrôle des permissions `*Wallet_Edit` sur les opérations manuelles ; retrait des
  mutations génériques `createOneDriverTransaction`, `createOneRiderTransaction`,
  `createOneProviderTransaction` (`create: { disabled: true }`).
- **Migration** : aucune.
- **Tests** : `gift-card.int-spec.ts` (carte créditée une fois ; carte utilisée ou expirée
  refusée ; deux clients sur la même carte en même temps : un seul crédit ; code de coupon
  refusé) ; `rider-order-update.int-spec.ts` (pourboire négatif refusé ; attente et
  coupon refusés après démarrage) ; ajouts à `driver-order-transitions.int-spec.ts`
  (pourboire crédité quand les espèces couvrent le prix ; `OnlyCash` ne touche pas le
  portefeuille) ; ajout à `admin-money.int-spec.ts` (opérateur sans permission refusé).
- **Apps** : rider-app non modifiée, mais testée sur téléphone (carte cadeau).
- **Effort** : 2 à 3 j backend, 0,5 j de test mobile.

### I2. Grand livre en partie double

- **Périmètre** : tables, déclencheurs, `postLedgerEntry`, passage des 9 sites d'appel,
  arrondi au franc, `LEDGER_MODE`, commande `ledger:open`, balayage d'intégrité,
  `ledgerIntegrityReport`. Contreparties de la recharge, du versement et des opérations
  manuelles.
- **Migration** : `LedgerTables` (`ledger_account`, `ledger_entry`, `ledger_line`,
  déclencheurs écrits à la main, colonne `ledgerEntryId` sur les 4 tables de lignes).
- **Tests** : `ledger.int-spec.ts` : écriture déséquilibrée refusée **par la base** ;
  `UPDATE` et `DELETE` refusés ; rejeu de la même clé, en série et en parallèle, = une
  écriture ; 50 courses mêlant espèces, portefeuille, mixte, annulation, recharge et
  versement, puis balayage à zéro écart ; 10 fins de course simultanées pour un même
  Kasiman ; ouverture lancée deux fois = une seule ; arrondis (188 et non 187,5 ; part de
  flotte + part Kasi = commission) ; mode `shadow` qui n'empêche pas une fin de course ;
  aucun appel direct à `rechargeWallet` hors `postLedgerEntry`.
- **Apps** : aucune. Panel : journal et rapport d'intégrité (peut suivre).
- **Effort** : 7 à 10 j backend, 2 à 3 j panel.

### I3. Dette espèces et plafond

- **Périmètre** : `money_policy`, `isBlockedForDebt` aux quatre endroits de 4.2,
  `settleDriverDebt`, push d'alerte et de blocage en texte direct, `kasimanAccount` et
  `kasimanStatement`, option flotte retenue (A par défaut).
- **Migration** : `MoneyPolicy` (table `money_policy`, et `driver.debtLimitOverride`
  nullable si retenu).
- **Tests** : `debt-limit.int-spec.ts` : Kasiman au-delà du plafond absent des
  destinataires de `createOrder`, de `availableOrders` et de la relance du cron ;
  acceptation refusée avec le message lisible ; course en cours terminée normalement ;
  push envoyée une seule fois au passage du seuil ; règlement opérateur qui débloque
  aussitôt ; règlement rejoué = un crédit ; compensation par une course payée en ligne ;
  part de flotte selon l'option.
- **Apps** : driver-app (relevé, bandeau, écran de blocage) ; panel (règlement, plafond,
  liste).
- **Effort** : 4 à 5 j backend, 3 à 4 j driver-app, 2 j panel.

### I4. Devis figé

- **Périmètre** : `FareQuoteService`, `fare_quote`, `request.quoteId`, champs `quoteId` et
  `quoteExpiresAt`, consommation atomique, appariement pour les apps installées, refus
  sans itinéraire, purge quotidienne.
- **Migration** : `FareQuote` (table `fare_quote`, `kind` et `parentQuoteId` compris,
  colonne `request.quoteId`).
- **Tests** : `fare-quote.int-spec.ts` : prix commandé = prix affiché avec options, coupon,
  forfait de zone et réservation ; devis expiré refusé pour une app qui envoie `quoteId` ;
  app sans `quoteId` qui retrouve son devis, coupon compris ; deux `createOrder`
  simultanés sur le même devis = une commande ; itinéraire à vol d'oiseau refusé ; forfait
  de zone accepté sans itinéraire ; total toujours entier. Le double d'itinéraire du
  harnais doit savoir simuler chaque source.
- **Apps** : rider-app (envoi de `quoteId`, coupon, options, relance).
- **Effort** : 5 à 7 j backend, 1 à 2 j rider-app.
- I4 ne dépend pas de I2 : il peut avancer en parallèle.

### I5. Impayé, arrêt ajouté, pourboire au relevé

- **Périmètre** : fin de course en impayé (5.5), règle de commande pour un client en
  négatif, mutation `addStop` et avenant de devis, lignes POURBOIRE et ARRET_AJOUTE au
  relevé.
- **Migration** : aucune si I4 a créé `kind` et `parentQuoteId`.
- **Tests** : impayé (course terminée, client négatif, Kasiman crédité en entier,
  recharge suivante qui solde) ; arrêt ajouté (écart calculé et inscrit, commission sur le
  nouveau total, rejeu = un seul avenant, arrêt refusé sur une course terminée) ;
  pourboire hors commission visible au relevé.
- **Apps** : rider-app (ajout d'arrêt, solde négatif), driver-app (arrêt ajouté et écart).
- **Effort** : 4 à 6 j backend, 2 à 3 j rider-app, 1 à 2 j driver-app.
- L'impayé sert surtout après `p2-momo`. L'écran d'ajout d'arrêt peut glisser après le
  pilote sans bloquer le reste.

### Récapitulatif (estimations)

| Incrément | Backend | Mobile | Panel | Nécessaire au pilote |
|---|---|---|---|---|
| I1 Correctifs | 2-3 j | 0,5 j | — | Oui |
| I2 Grand livre | 7-10 j | — | 2-3 j | Oui |
| I3 Dette et plafond | 4-5 j | 3-4 j | 2 j | Oui |
| I4 Devis figé | 5-7 j | 1-2 j | — | Oui |
| I5 Impayé, arrêt, pourboire | 4-6 j | 3-5 j | — | Non (après `p2-momo` pour l'impayé) |
| **Total** | **22-31 j** | **7,5-11,5 j** | **4-5 j** | |

Environ 34 à 48 jours-développeur, soit 7 à 10 semaines-développeur : dans la fourchette
de `lot-argent` (6 à 10 semaines). Pour le pilote de janvier, I1 à I4 suffisent
(27 à 37 j environ).

---

## 8. Questions à trancher par l'utilisateur

> **Tranché le 2026-10-19** : les recommandations 8.1 à 8.5 sont validées par
> l'utilisateur (`KASI_DECISIONS.md`, entrée du 2026-10-19). Les points 8.6 à 8.10 restent
> ouverts, à trancher avant les incréments I3 et I4.

### 8.1 Fourchette de commission (`d-commission`)

Le brief dit 10 à 18 %, la revue du business plan de juillet 12 à 18 %. Techniquement,
la commission reste un paramètre **par service** (`providerSharePercent`, déjà en place) ;
la fourchette sert de borne de saisie dans le panel. Un taux par zone n'est pas
nécessaire au pilote et relèverait de `p2-parametrage`.

**Recommandation** : fourchette 10-18 %, qui laisse de la marge pour attirer les taximen
déjà installés, et un taux unique de lancement fixé par l'équipe produit (12 à 15 %). La
valeur elle-même est une décision produit.

### 8.2 Montant du plafond de dette et qui le règle

Repère : un Kasiman actif fait environ 15 courses par jour, à 2 000 FCFA en moyenne. À
12 %, il accumule environ 3 600 FCFA de commission par jour.

**Recommandation** : plafond de **10 000 FCFA** (environ trois jours d'activité), alerte à
7 500 FCFA. La dette est réglée **par le Kasiman lui-même** : en espèces au siège ou chez un
relais contre reçu pendant le pilote, par Wave ou Orange Money depuis l'app après
`p2-momo`. Règlement attendu au moins une fois par semaine. Montants modifiables dans le
panel sans déploiement.

### 8.3 Dette en cas de flotte

**Recommandation** : option A (4.5) pour le pilote. Le Kasiman porte sa dette et la flotte
est payée tout de suite. Le risque est borné par le plafond. Revoir au bilan du pilote
(option B ou C selon les flottes recrutées).

### 8.4 Porter BetterSuite ou écrire en interne

**Recommandation** : écrire le grand livre en interne (3.11). BetterSuite n'a ni partie
double, ni dette, ni devis. Ses ajouts de reporting se porteront en `p4-pilotage`, après le
pilote, sur le grand livre.

### 8.5 Sort des mutations CRUD génériques

**Recommandation** : les retirer dès I1 (`create: { disabled: true }` sur les lignes
Kasiman, client et Kasi), comme c'est déjà fait pour la flotte. Aucun client ne les
appelle (vérifié). La lecture des lignes reste en place. Toute opération manuelle passe
par les mutations sur mesure, avec permission, clé, motif et, après I2, contrepartie.

### Autres arbitrages, moins urgents

- **8.6 Qui paie les coupons ?** Aujourd'hui le Kasiman en porte une partie (1.6).
  Recommandation : Kasi finance ses promotions. Le Kasiman est payé sur le prix avant
  coupon, la commission aussi ; la remise est une ligne `KASI:PROMOTIONS`. C'est cohérent
  avec la promesse faite aux Kasimen.
- **8.7 Durée d'honneur d'un devis pour une app installée** : 10 minutes recommandées
  (5.3), 2 minutes pour les apps à jour.
- **8.8 Client en négatif** : recommandation, commandes permises en espèces seulement tant
  que le solde est négatif ; au-delà de 3 000 FCFA de dette (environ une course),
  commande refusée avec un message lisible.
- **8.9 Commission touriste** : le multiplicateur touriste augmente le prix **et** le taux de
  commission (`service.service.ts` l. 92-94, SOS l. 601-605). À confirmer comme voulu.
- **8.10 Refus sans itinéraire** (5.4) : accepter de lever l'invariant de `routing.service.ts`.

### Décisions à inscrire au journal (session principale)

Après arbitrage, dans `app-kasi/KASI_DECISIONS.md` : grand livre interne et portefeuilles
en projection ; convention de signe et arrondi au franc ; plafond et règlement ; option
flotte ; devis figé et appariement des apps installées ; refus sans itinéraire ; retrait
des mutations génériques ; financement des coupons.
