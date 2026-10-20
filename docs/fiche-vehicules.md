# Fiche véhicules : moto, taxi et camionnette

**Point** : `p2-vehicules` (`lot-vehicules`). **Points liés** : `sc-kasiman`, `sc-flotte`,
`p2-kyc` (K4), `bug-push-anglais`, `bug-debordements`. **Hors champ** : `d-nom-app`
(décision de marque, l'app garde son nom actuel).
**Rédigée le** 2026-10-20. **État** : V1 à V4 faits en local, non committés.
Arbitrages tranchés par l'agent, à revoir (`KASI_DECISIONS.md`, entrée « p2-vehicules »).

## 1. Kasi aujourd'hui (avant ce lot)

- **Modèles** : table `car` (`CarModelEntity`, colonne `title`), une liste à plat ; le
  jeu de démo y mêle motos (Yamaha Crux, TVS HLX), voitures et camionnettes (Kangoo,
  Sprinter), sans rien pour les distinguer.
- **Couleurs** : `car_color`. **Kasiman** : `driver.carId`, `carColorId`, `carPlate`,
  `carProductionYear`, plus `canDeliver` et `maxPackageSize` (colis).
- **Services** : `service.orderType` (`Ride`, `Delivery`) ; « Kasi Moto Livraison » et
  « Kasi Moto Express » (colis, ex-Tiak-Tiak), « Kasi Ville » (personnes), « Kasi Pro
  Tournée » (entreprises). Le service est attribué au Kasiman par l'opérateur
  (`enabledServices`) ; rien n'empêche d'attribuer « Kasi Ville » à une moto.
- **Inscription driver-app** (`register_ride_details_view.dart`) : plaque, année,
  « Modèle de voiture », « Couleur de la voiture ». Titre de l'étape : « Entrez les
  détails de votre course » (contresens). Un livreur à moto choisit un modèle dans une
  liste de voitures.
- **KYC** (K1 à K3) : mêmes documents pour tous les véhicules (fiche KYC, Q2).

## 2. La cible

Un **type de véhicule** porté par le Kasiman : `Motorcycle` (moto), `Car` (taxi ou
voiture), `Van` (camionnette). Il ne crée ni une seconde communauté ni un second badge
(vision, piliers 1 et 5) : il conditionne seulement :

1. **les services** : `service.vehicleTypes` liste les véhicules admis (vide = tous).
   Le dispatch (`SharedDriverService.getOnlineDriversWithServiceId`, point unique des
   modes `legacy` et `waves`) et la liste des offres (`getOrdersForDriver`) écartent
   un Kasiman dont le véhicule n'est pas admis ;
2. **les modèles proposés** : `car.vehicleType` filtre la liste à l'inscription ;
3. **les documents exigés** (K4) : `driver_document_type.vehicleTypes` (vide = tous).
   Seuls les documents exigés pour son véhicule suspendent un Kasiman, et ils doivent
   tous être validés pour qu'un nouveau Kasiman soit approuvé.

Un Kasiman sans type (inscrit avant ce lot) reste accepté partout et se voit demander
tous les documents : personne ne perd ses offres au déploiement.

## 3. Contrat mobile (ajouts seulement)

driver-api :
- énumération `VehicleType` ; champs `Driver.vehicleType`, `CarModel.vehicleType`,
  `Service.vehicleTypes`, `DriverDocumentType.vehicleTypes` ;
- `UpdateDriverInput.vehicleType` (facultatif).

Rien de renommé ni retiré. Comportements changés, visibles par les apps installées :
- `driverDocumentTypes` ne renvoie que les types exigés pour le véhicule du Kasiman
  (tout le catalogue s'il n'a pas de type) ;
- `updateOneDriver(vehicleType)` d'un Kasiman actif qui a déjà un type est ignoré
  (comme un statut refusé : la réponse porte le vrai type) ;
- push : texte français envoyé par le serveur au lieu des clés `titleLocKey`.

admin-api (panel) : mêmes champs, `CarModelInput.vehicleType`,
`ServiceInput.vehicleTypes`, `DriverDocumentTypeInput.vehicleTypes`, filtre
`Driver.vehicleType`, requête `missingDriverDocuments(driverId)`. L'approbation
(`updateOneDriver(status: Offline/Online)` depuis `waiting documents` ou `pending
approval`) exige un type et les documents obligatoires validés : erreurs
`DRIVER_VEHICLE_TYPE_REQUIRED`, `DRIVER_DOCUMENTS_MISSING`.

Migration `VehicleTypes1792493301332`, additive : énumération `vehicle_type_enum`,
deux colonnes nullables, deux listes vides par défaut, reprise du type du modèle.

## 4. Notifications et textes (même lot)

- **`bug-push-anglais`** : les deux services d'envoi
  (`libs/database/src/lib/order/firebase-notification-service/`) n'envoyaient que des
  clés, résolues par les `strings.xml` anglais des apps. Les textes vivent désormais
  dans `push-texts.ts`, en français, envoyés tels quels : les apps installées sont
  corrigées sans mise à jour. Tous les envois FCM du dépôt passent par ces deux
  fichiers ; les push texte (dette, dispatch, KYC) étaient déjà en français.
- **Restent en anglais** (hors push, laissés tels quels) : erreurs de coupon
  (`common-coupon.service.ts`, comparées mot pour mot par la rider-app installée,
  `service_selection_card_view.dart:47`), « Credit is not enough »
  (`shared-order.service.ts:484`), modèle SMS par défaut de l'entité
  (`sms-provider.entity.ts:33`, et le fournisseur 4 du jeu de démo).
- **`bug-debordements`** (driver-app) : barre d'accueil refaite (`top_bar_pill.dart`) ;
  « FCFA » au lieu de « CFA » partout (`money_format.dart`) ; libellés « véhicule »
  au lieu de « voiture ». Autres débordements relevés (paiement, pourboire, « Arrivée
  dans 2 ») non traités ici.

## 5. Incréments

| # | Contenu | Validation | État |
|---|---|---|---|
| V1 | Backend : migration, dispatch, choix du type, K4 (portée, approbation) | Banc (6 tests) | Fait |
| V2 | Push en français | Banc ; téléphone réel à faire | Fait |
| V3 | driver-app : type à l'inscription et au profil, barre d'accueil, FCFA | Émulateur | Fait |
| V4 | Panel : modèles, services, fiche Kasiman, catalogue des documents | Build | Fait |
| V5 | Paramétrage réel : classer les modèles, restreindre les services | Équipe (`p2-parametrage`) | À faire |

## 6. Questions tranchées (à revoir)

| # | Question | Choix |
|---|---|---|
| Q1 | Valeurs | `Motorcycle`, `Car` (taxi et voiture particulière), `Van` (camionnette, tricycle cargo). Taxi et VTC ne sont pas distingués : le permis et la carte de taxi relèvent du catalogue des documents. |
| Q2 | Où vit le type | Sur le Kasiman, pas seulement sur le modèle : un modèle peut manquer ou être mal classé, et c'est le Kasiman qui porte le badge et les documents. |
| Q3 | Kasiman sans type | Accepté par tous les services et soumis à tous les documents (prudence des deux côtés). |
| Q4 | Qui change le type | Le Kasiman à l'inscription, ou une fois au profil s'il n'en a pas ; ensuite l'opérateur seul. |
| Q5 | Service vide | Admet tous les véhicules : rien ne change au déploiement ; le paramétrage se fait au panel. |
| Q6 | Approbation | Type obligatoire et documents obligatoires de ce véhicule validés ; les Kasimen déjà actifs ne sont pas concernés (Q3 de la fiche KYC). |
| Q7 | SMS (K4) | Non fait : reste à brancher sur le fournisseur SMS existant. |
