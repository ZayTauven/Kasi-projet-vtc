# Fiche de décision : paiement mobile Wave et Orange Money via Bictorys (`p2-momo`)

Point du référentiel : `p2-momo` (phase 2, `lot-momo`, cible `sc-momo`), branché sur `p2-argent`.
Passerelle choisie par l'utilisateur le 10 juillet 2026 (`KASI_DECISIONS.md`, entrée « passerelle
de paiement = Bictorys »). Côté Kasi (§1 à §7) : kasi-integrations-auditor, 20 octobre 2026, code
relu ce jour-là. Documentation Bictorys (§8) : session principale, même jour. Statut : **en
attente**. Le 20 octobre, l'utilisateur a mis Bictorys de côté : un autre fournisseur est envisagé,
et l'encaissement se fait en espèces en attendant (`KASI_DECISIONS.md`). Les §1 à §6 restent
valables pour tout fournisseur ; la §8 serait à refaire.

**En bref** : Kasi n'encaisse aujourd'hui qu'en espèces. Son seul chemin de paiement en ligne passe
par un serveur externe hérité du template Ridy, qui n'existe nulle part. Recommandation : écrire un
module Bictorys dans les API Kasi, sans serveur intermédiaire. Le crédit passe par un webhook dont
la transaction est revérifiée auprès de Bictorys. Le contrat actuel des apps est gardé
(`topUpWallet` renvoie une URL) : les apps installées fonctionnent sans mise à jour. Les
passerelles héritées et leurs SDK sont à archiver.

## 1. Ce qui existe aujourd'hui

### Le parcours hérité

1. **L'app demande une URL** par la mutation `topUpWallet` :
   - rider : `apps/rider-api/src/app/wallet/wallet-resolver.ts:24-44` ;
   - driver : `apps/driver-api/src/app/wallet/wallet-resolver.ts:22-30`.

   L'API renvoie `GATEWAY_SERVER_URL/pay?userId=…&amount=…&returnUrl=<API>/payment_result`. Le
   montant est celui envoyé par l'app, sans contrôle. Une passerelle introuvable fait planter le
   résolveur (`gateway.id` sur `null`).
2. **Le serveur de passerelle encaisse** avec les clés lues dans `payment_gateway`. La
   `privateKey` y est stockée en clair (`libs/database/src/lib/entities/payment-gateway.entity.ts:41-44`).
3. **Il écrit lui-même dans la base Kasi.** Aucun code Kasi n'insère de ligne `payment`
   (`libs/database/src/lib/entities/payment.entity.ts`) : le serveur externe a donc un accès
   direct à la base.
4. **Le retour passe par le navigateur.** `GET payment_result?token=…` :
   - rider : `apps/rider-api/src/app/rider-api.controller.ts:67-186` ;
   - driver : `apps/driver-api/src/app/driver-api.controller.ts:49-111`.

   Le jeton est déchiffré en AES-256-CBC (`libs/database/src/lib/crypto.service.ts:23-37`). On en
   tire `userId`, `amount` et `status`, puis :
   - le compte est crédité au grand livre (`PASSERELLE:<id>` vers `CLIENT` ou `KASIMAN`) ;
   - la ligne `payment` est supprimée ;
   - côté rider, la course en attente est poursuivie : `finish` en `WaitingForPostPay`,
     `processPrePay` en `WaitingForPrePay`.
5. **Préautorisation, capture et annulation** passent par des appels HTTP au même serveur :
   - capture : `libs/database/src/lib/order/shared-order.service.ts` (`finish`) ;
   - annulation client : `apps/rider-api/src/app/order/rider-order.service.ts:321-336, 351-364` ;
   - annulation Kasiman : `apps/driver-api/src/app/order/order.service.ts:162-186`.

### Qui est ce serveur de passerelle ?

C'est le serveur de paiement séparé du template Ridy. Il est absent du dépôt Kasi et de
BetterSuite 5.3.2, où `cancel_preauth` et `create_payment_link` n'ont que des appelants. Les
variables `GATEWAY_SERVER_URL`, `ENCRYPTION_KEY`, `RIDER_SERVER_URL` et `DRIVER_SERVER_URL` ne
figurent ni dans `docker-compose.yml` ni dans `.env.example` (vérifié le 20 octobre). Le banc les
pointe vers `127.0.0.1:9` (`tools/test-integration/env.ts`). **Le paiement en ligne est donc
inopérant en production.**

### Défauts du mécanisme hérité

- **Crédit dépendant du navigateur.** Si le client ferme la page avant la redirection, il paie
  sans être crédité. Il n'y a ni webhook serveur à serveur ni rapprochement.
- **Jeton non authentifié.** Chiffrement CBC sans MAC ni contrôle de date : le jeton est
  malléable et rejouable. Le rejeu est absorbé par `MoneyKey`, pas la falsification.
- **Montant et utilisateur lus dans le jeton**, et non dans une ligne créée par Kasi.
- **Données dans les journaux** : `Logger.log('Payment:' + JSON.stringify(decrypted))`
  (`rider-api.controller.ts:77`).
- **`processPrePay` a sa condition inversée** (vérifié le 20 octobre) : elle lève
  `Credit is not enough` quand le crédit *dépasse* le minimum. Le chemin est mort aujourd'hui
  (`prepayPercent` à 0). BetterSuite l'a corrigée
  (`New Direction/Ridy/libs/database/src/lib/order/shared-order.service.ts:794`). Les numéros de
  ligne cités en `fiche-conception-argent.md` §1.4 sont périmés.
- **La branche `authorized`** (`rider-api.controller.ts:150-158`) plante si aucune course n'est
  en cours.

### Ce qui est déjà prêt côté grand livre (`p2-argent`)

- **Clé d'unicité** : `MoneyKey.gatewayPayment`, de la forme `payment:<gw>:<référence>`
  (`libs/database/src/lib/order/wallet-ledger.ts`).
- **Comptes** : `LedgerAccounts.passerelle(gatewayId)` et `tresorerie('WAVE'|'ORANGE_MONEY')`
  (`libs/database/src/lib/order/ledger.ts`).
- **Versements** : `postLedgerEntry` est déjà branché dans `processPayout`
  (`apps/admin-api/src/app/payout/payout.service.ts`, clé `payout:<id>`).
- **À ajouter à la §3.10 de la fiche argent** : si Bictorys retient ses frais sur le reversement
  (`settledAmount` < `amount`, voir §8), il faut une ligne et un compte de frais, par exemple
  `KASI:FRAIS_PASSERELLE`. Sans eux, le compte `PASSERELLE` ne se rapproche jamais du relevé
  Bictorys.
- **Fiche argent §5.5 (impayé)** : la course se termine même si le solde manque, et la prochaine
  recharge par Wave solde la dette. C'est cohérent avec le webhook proposé.
- **État** : grand livre écrit en local en `LEDGER_MODE=shadow`, non déployé en production.

### Ce que voient les apps installées (skill `kasi-contrat-mobile-backend`)

- **Liste des moyens de paiement** : `paymentGateways { id title type publicKey media }`
  (`rider-app/lib/wallet/wallet.graphql`, `driver-app/lib/wallet/wallet.graphql`). Une ligne
  Bictorys apparaît d'elle-même, avec son titre et son logo.
- **Nouvelle valeur d'énumération** : les deux apps ont un repli `$unknown` et aucune ne fait de
  `switch` sur `type`. L'ajout est sans danger.
- **Ouverture du paiement** : `launchUrl(url, externalApplication)`, sans lire `status` :
  - `rider-app/lib/wallet/add_credit_sheet_view.dart` ;
  - `rider-app/lib/main/pay_for_ride_sheet_view.dart` ;
  - `driver-app/lib/wallet/add_credit_sheet_view.dart`.

  N'importe quelle page de paiement Bictorys convient.
- **Retour dans l'app** : schémas `default.rider.redirection://` et `default.driver.redirection://`
  (AndroidManifest). Il ne faut pas changer `RIDER_APPLICATION_ID` ni `DRIVER_APPLICATION_ID`.
- **Paiement d'une course** :
  - une fin de course sans espèces fait passer la course en `WaitingForPostPay` ;
  - le Kasiman voit alors la facture et le bouton « espèces reçues » ;
  - le client voit « Payer la course » (`rider-app/lib/main/order_status_sheet_view.dart`).
- **Piège** : `PayRide` exécute `topUpWallet` **avant** `updateOneOrder(tipAmount)`. Un montant
  recalculé par le serveur dans `topUpWallet` ignore donc le pourboire qui vient d'être saisi.
- **Anomalie hors lot (`p2-parametrage`)** : les préréglages de pourboire `[10, 20, 50]`
  (`pay_for_ride_sheet_view.dart:21`) n'ont pas de sens en FCFA.

### Passerelles héritées

- **Énumération** : 20 valeurs dans
  `libs/database/src/lib/entities/enums/payment-gateway-type.enum.ts`, aucune pour le Sénégal.
- **SDK** : 5 paquets npm (stripe, paypal, razorpay, paystack, mercadopago), importés nulle part
  dans `apps/` ni `libs/`.
- **Panel** : un cas par passerelle (`payment-gateway-view.component.ts`).

## 2. Ce que fait BetterSuite 5.3.2

Même modèle : serveur externe et jeton chiffré renvoyé par le navigateur. Il est un peu meilleur :

- le lien est demandé en POST, de serveur à serveur (`create_payment_link`) ;
- la passerelle est vérifiée ;
- le jeton porte `orderId` ;
- `processPrePay` est corrigé ;
- les moyens de paiement peuvent être enregistrés.

Mais le crédit dépend toujours de la redirection du navigateur, et le serveur reste fermé. **À ne
pas porter**, sauf la correction de `processPrePay`. Les cartes enregistrées sont sans objet pour
Wave et Orange Money.

## 3. Options comparées

| Critère | A. Module Bictorys dans les API Kasi | B. Réécrire le serveur de passerelle avec Bictorys | C. API Wave et Orange Money en direct |
|---|---|---|---|
| Écart à la décision du 10 juillet | Aucun | Aucun | Contraire (deux intégrations, deux KYC) |
| Effort | Moyen (environ 2 à 3 semaines, hors versements) | Moyen à élevé (un service de plus, protocole hérité à reproduire) | Élevé |
| Sécurité | Webhook vérifié ; montant et utilisateur lus dans une ligne créée par Kasi | Garde le jeton CBC et l'accès direct à la base | Comme A |
| Préautorisation | Abandonnée (le mobile money n'en a pas) | À simuler | Abandonnée |
| Apps installées | Compatibles, aucune version à publier | Compatibles | Compatibles |
| Exploitation | Aucun service de plus | Un conteneur de plus, une seconde copie des secrets | Comme A |
| Réversibilité | Interface `PaymentProvider` : un autre agrégateur se branche à côté | Faible | Moyenne |

## 4. Recommandation

| Intégration | Usage réel | Couplage | Verdict | Coût de migration |
|---|---|---|---|---|
| Bictorys (Wave, Orange Money, Free Money si disponible) | Aucun | — | **Ajouter (option A)**, derrière une interface `PaymentProvider` dans `libs/database` | Moyen |
| Serveur de passerelle externe, `payment_result` à jeton, `CryptoService` | Mort (variables absentes) | Fort (accès direct à la base) | **Archiver** quand Bictorys sera en place. `payment_result` devient une simple page de retour vers l'app, sans crédit | Faible |
| Préautorisation, capture, `cancel_preauth` | Mort (`prepayPercent` à 0) | Moyen | **Archiver**, au profit d'un vrai prépaiement avec remboursement, plus tard | Faible |
| 19 passerelles héritées (énumération et panel) | Aucune ligne utile | Faible | **Masquer** dans le panel. Les valeurs restent en base et en GraphQL : les supprimer obligerait à recréer le type PostgreSQL | Faible |
| SDK npm stripe, paypal, razorpay, paystack, mercadopago | Aucun import | Nul | **Retirer** de `package.json` | Faible |
| Versements aux Kasimen (`payout`) | Manuels, écrits au grand livre | — | **Garder manuels** pour le pilote. Les brancher ensuite sur l'API de versement Bictorys (`createpayout`, qui existe, voir §8) | Moyen |

**Flux retenus**

1. **Recharge du portefeuille (client ou Kasiman).**
   - `topUpWallet` crée une ligne `payment` côté Kasi : utilisateur, montant, devise, course,
     statut `Pending`.
   - Il crée une charge Bictorys (`paymentReference` = identifiant de cette ligne, opérateur
     présélectionné par `payment_type`) et renvoie le `link` reçu.
   - Le **webhook** compare le secret, puis **relit la transaction auprès de Bictorys**
     (`gettransactiondetails`). Il passe la ligne à `Succeeded`, au lieu de la supprimer.
   - Il écrit l'écriture `payment:<gw>:<id Bictorys>` (`PASSERELLE` −x, `CLIENT` ou `KASIMAN` +x),
     avec le montant de la ligne Kasi.
   - Une recharge du Kasiman solde sa dette (fiche argent §4.4).
2. **Paiement direct d'une course** (post-paiement, parcours existant).
   - C'est une recharge du montant dû, suivie de `finish` dans le webhook. Deux écritures :
     `payment:…` (recharge), puis `order:<id>:finish`.
   - Le serveur recalcule le montant minimal : `costAfterCoupon + tipAmount − paidAmount −
     max(0, crédit)`. Un montant supérieur est accepté, à cause du pourboire envoyé après
     `topUpWallet`.
   - Si le Kasiman déclare des espèces entre-temps, le verrou de `finish` absorbe le cas : le
     paiement Wave reste en crédit au portefeuille du client.
3. **Rapprochement** : une tâche relit chez Bictorys les paiements `Pending` de plus de quelques
   minutes, au cas où un webhook serait perdu. Au-delà de 2 h, Bictorys les considère expirés.
4. **Prépaiement** : désactivé au pilote. Plus tard, un vrai paiement puis un remboursement à
   l'annulation, correction de `processPrePay` comprise.

**Contrat mobile** : aucun champ GraphQL retiré ni renommé. Seuls ajouts : une valeur
d'énumération (repli `$unknown` présent) et une route REST pour le webhook. Aucune version d'app à
publier.

## 5. Critère de sortie de la phase 2 : « une course payée par Wave, visible au grand livre »

Le minimum nécessaire :

- les flux 1 et 2 ci-dessus, avec webhook et rapprochement ;
- le grand livre déployé en production (migrations `p2-argent`, chantier de déploiement groupé) ;
- un **compte marchand Bictorys en production**, pas en bac à sable ;
- une URL publique en HTTPS pour le webhook ;
- un moyen de consulter les deux écritures : le journal du panel (encore à faire), ou en
  attendant `ledgerIntegrityReport` et du SQL.

Le versement Wave au Kasiman reste manuel. Il est déjà écrit en `payout:<id>` et n'est pas requis
par le critère.

| | Recharge du portefeuille | Paiement direct d'une course |
|---|---|---|
| Écran | « Ajouter du crédit » (rider-app et driver-app) | « Payer la course » en `WaitingForPostPay` |
| Écritures | 1 (`payment:…`) | 2 (`payment:…`, puis `order:<id>:finish`) |
| Montant | Libre, avec un minimum et un maximum à fixer | Minimum recalculé par le serveur |
| Effets de bord | Aucun | `finish`, remise en ligne du Kasiman, `orderUpdated` |
| Tests | Webhook rejoué, secret invalide, transaction absente chez Bictorys, montant différent | En plus : espèces déclarées en même temps, course annulée avant le webhook |

## 6. Plan d'intégration par agent (après validation)

- **kasi-backend-services** :
  - `libs/database/src/lib/payment/` avec `PaymentProvider` et `BictorysProvider` ;
  - `topUpWallet` sur les deux API ;
  - une seule route de webhook (Bictorys n'en accepte qu'une par compte, voir §8), qui traite
    client et Kasiman d'après la ligne `payment`, plus la route de retour ;
  - la tâche de rapprochement ;
  - la valeur d'énumération (migration `ALTER TYPE … ADD VALUE`) ;
  - la correction de `processPrePay` et le retrait des SDK morts ;
  - les tests sur le banc d'intégration, avec un Bictorys simulé ;
  - les secrets en variables d'environnement (`BICTORYS_API_KEY`, `BICTORYS_WEBHOOK_SECRET`,
    `BICTORYS_BASE_URL`), plus en base.
- **kasi-devops-infra** : ces variables dans les fichiers compose et `.env.example`, sans valeur.
  Le webhook n'est pas signé sur son corps : aucune contrainte nginx sur le corps brut.
- **kasi-admin-panel** : formulaire de passerelle Bictorys, types hérités masqués, liste des
  paiements et de leur statut.
- **kasi-mobile-apps** : rien pour le pilote. Plus tard : préréglages en FCFA et message « paiement
  en cours » côté Kasiman.
- **Validation** : un vrai paiement Wave en production, sur téléphone réel, avec la rider-app et
  la driver-app installées.

## 7. Décisions qui reviennent à l'utilisateur

1. **Au nom de quelle entité** ouvrir le compte marchand Bictorys (NINEA, RCCM), et sur quel compte
   bancaire recevoir les reversements.
2. **Qui supporte les frais Bictorys** : Kasi, qui les absorbe sur sa commission de 10 à 18 % pour
   un ticket de 1 000 à 3 000 FCFA, le client, ou le Kasiman sur ses recharges.
3. **Présentation dans l'app** : deux moyens de paiement (Wave, Orange Money) ou un seul
   « Bictorys ». Bictorys permet de présélectionner l'opérateur (§8). Recommandation : deux lignes,
   donc deux comptes `PASSERELLE` rapprochés par leur somme.
4. **Montants minimum et maximum** de recharge.
5. **Versements aux Kasimen** : manuels pendant le pilote (recommandé), ou par l'API Bictorys dès
   la phase 2.
6. **Remboursement** : crédit au portefeuille (simple) ou remboursement par mobile money. L'API de
   remboursement existe, mais il faut confirmer qu'elle couvre Orange Money.
7. **Free Money (Yas)** : l'activer s'il est disponible (`payment_type=free_money` existe).

**Actions humaines à lancer tout de suite, car elles sont longues** :

- demander le compte marchand et déposer le dossier KYC Bictorys ;
- obtenir dès maintenant les clés de bac à sable, pour développer pendant le KYC ;
- déclarer l'URL du webhook dans le tableau de bord ;
- vérifier si un compte Wave Business ou Orange Money marchand est exigé en plus ;
- faire un point avec la CDP sur les données de paiement (loi n° 2008-12).

## 8. Ce que dit la documentation Bictorys (lue le 20 octobre 2026)

Source : https://docs.bictorys.com (index : https://docs.bictorys.com/llms.txt).

| Question | Réponse | Conséquence pour Kasi |
|---|---|---|
| Environnements | Test : `https://api.test.bictorys.com` ; production : `https://api.bictorys.com`. Clé et webhook propres au mode Live, bascule depuis le tableau de bord | `BICTORYS_BASE_URL` en variable |
| Authentification | En-tête `X-API-Key`. Les exemples la placent dans du code client | Clé côté serveur **uniquement**, jamais dans une app |
| Encaissement | `POST /pay/v1/charges?payment_type=wave_money\|orange_money\|free_money\|maxit\|card…`. Sans `payment_type`, le client arrive sur la page de paiement Bictorys | Opérateur présélectionnable : deux lignes possibles (décision 3) |
| Corps de la charge | `amount`, `currency` (XOF), `paymentReference` (notre référence), `merchantReference`, `country` (SN), `customerObject` (`country` obligatoire), `successRedirectUrl`, `errorRedirectUrl`, `authorization` (préautorisation) | `paymentReference` = identifiant de la ligne `payment` Kasi |
| Réponse | 201, mobile money : `transactionId`, `link`, `qrCode` (base64), `redirectUrl`, `message`. 202, page Bictorys : `link`, `chargeId`, `opToken` | `topUpWallet` renvoie `link` : les apps installées l'ouvrent déjà |
| URL de notification | Pas de `callbackUrl` par requête : **un seul webhook par compte**, déclaré dans le tableau de bord | Une seule route sert client et Kasiman |
| **Authenticité du webhook** | **Pas de signature HMAC** : l'en-tête `X-Secret-Key` porte le secret en clair, à comparer à celui du tableau de bord | Comparaison en temps constant, **et revérification de chaque transaction par `gettransactiondetails`** avant tout crédit. Sinon, un secret qui fuit suffit à créditer n'importe qui |
| Corps du webhook | `id`, `type` (`payment`), `amount` + `currency` (payés par le client, frais client compris), `settledAmount` + `settledCurrency` (reçus par le marchand), `status`, `paymentReference`, `merchantReference`, `timestamp`. Des champs peuvent être ajoutés sans préavis | Montant et devise contrôlés contre la ligne Kasi ; écart `amount − settledAmount` = frais (compte de frais, §1) ; champs inconnus ignorés |
| Statuts | Documentation incohérente : la table donne initié, en attente, succès, échoué, expiré ; l'exemple de webhook donne `succeeded` et `authorized`, comparés en minuscules. Une transaction en attente depuis plus de 2 h est considérée expirée | Accepter seulement `succeeded`, sans tenir compte de la casse. Tout autre statut ne crédite rien. Tests sur les deux graphies |
| Consultation | `gettransactiondetails` (une transaction par id), `gettransactions` (liste) | Sert à la revérification et au rapprochement |
| Remboursement | `refundtransaction` | Couverture d'Orange Money à confirmer (l'API OM Sénégal n'en propose pas en direct) |
| Versements | `createpayout` (vers un compte mobile money), `createbatchpayout` | Versements aux Kasimen automatisables après le pilote |
| Bac à sable | Paiement mobile money simulé en scannant le QR affiché avec la caméra ; les vraies apps Wave et Orange Money ne fonctionnent pas en test. **Les URL de redirection ne sont pas appelées en test pour le mobile money** | Le crédit repose sur le webhook (déjà le cas). Le retour vers l'app ne se teste qu'en production ou avec une carte de test |

**Non documenté, à demander à Bictorys** : frais par opérateur et option « frais au client » ;
délai et rythme des reversements ; plafonds par transaction et par jour ; IP sources des webhooks
(liste blanche) et politique de relance ; pièces du KYC marchand et délai d'activation du mode
Live ; acceptation de montants XOF entiers sans décimales.

Repère tiers, non vérifié : frais marchand Wave d'environ 1 %, Orange Money plus cher (blog
Kolonell, 2026).
