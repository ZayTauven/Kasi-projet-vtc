# Fiche KYC : documents typés et expiration

**Point** : `p2-kyc` (`lot-kyc`). **Points liés** : `bs-mod-kyc`, `bs-act-kyc`, `sc-kyc`.
**Rédigée le** 2026-10-20. **État** : K1 à K3 faits, non committés ; K4 fait pour la portée par
véhicule et l'approbation (`docs/fiche-vehicules.md`), SMS restant.
Questions de la section 6 tranchées par la session principale, à revoir
(`KASI_DECISIONS.md`, entrée « p2-kyc K1 »).
**Méthode** : skill `kasi-portage-bettersuite` (licence confirmée). BetterSuite est lu,
pas copié : son module tient en 310 lignes et repose sur l'e-mail, MySQL et un modèle
absent de Kasi.

## 1. Kasi aujourd'hui

- **Modèle** : `driver.documents` = `MediaEntity[]` (`media.driverDocumentId`), ni type,
  ni numéro, ni date d'expiration, ni état de validation. La note de refus vit dans
  `driver.documentsNote` (`softRejectionNote`).
- **Envoi** (driver-app installée) : `POST /upload_document` (driver-api, un fichier par
  appel, rattaché au Kasiman), puis `setDocumentsOnDriver` + `updateOneDriver(status:
  PendingApproval)` (`driver-app/lib/register/register.graphql`). Aucun choix de type.
- **Panel** : onglet « Documents » de la fiche Kasiman (`driver-profile-documents`) :
  vignettes en lecture seule. La validation consiste à changer le statut du Kasiman.
- **Statuts** : `waiting documents` → `pending approval` → `offline`/`online` ; refus :
  `soft reject` (l'app installée affiche la note et propose de renvoyer les documents,
  `unregistered_driver_messages_view.dart`) ou `hard reject`.
- **Conséquence** (`1-existant-bilan`) : un permis expiré ne bloque rien.
- **Faille trouvée** : `DriverQueryService.updateOne` (driver-api) devait limiter les
  statuts que le Kasiman pose lui-même, mais compare `DriverStatus[status]`, toujours
  `undefined` : le filtre laisse tout passer. Un Kasiman refusé ou bloqué peut se remettre
  `online` lui-même. Une suspension pour document expiré serait donc sans effet.

## 2. BetterSuite 5.3.2 (lecture seule)

- **Modèle** : `driver_document` (catalogue : `title`, `isEnabled`, `isRequired`,
  `hasExpiryDate`, `notificationDaysBeforeExpiry`, `numberOfImages`),
  `driver_to_driver_document` (Kasiman, type, `mediaId`, `expiresAt`, politique de
  rétention), `driver_document_retention_policy`.
- **Contrôle** (`apps/admin-api/src/app/kyc-expiration`) : file BullMQ
  `kyc-expiration-checker`, job répétable `0 9 * * *` ; documents expirés → Kasiman
  retiré du pool Redis et passé `SoftReject` ; rappels **par e-mail** à J-30, 14, 7, 3, 2, 1.
- **Limites** : tout document expiré suspend, obligatoire ou non ; pas d'état de
  validation ; aucun dédoublonnage des rappels (un job rejoué renvoie tout) ; le Kasiman
  peut redevenir actif sans document à jour ; e-mail inadapté aux Kasimen.
- **Correspondance** : `driver_document` → `driver_document_type` (Kasi) ;
  `driver_to_driver_document` → `driver_document` (Kasi) ; `MediaEntity` identique ;
  rétention : Kasi a déjà `retention_policy` (générique), non reprise ici.

## 3. La cible

1. **Catalogue typé** `driver_document_type` : code, titre, obligatoire, avec date
   d'expiration, jours de rappel, ordre, actif. Semé : permis de conduire, carte grise,
   assurance, pièce d'identité, visite technique (section 6, Q1).
2. **Documents du Kasiman** `driver_document` : type, fichier (`media`), numéro,
   `expiresAt` (date, valable jusqu'au jour inclus), état `pending`, `approved`,
   `rejected`, `expired`, `replaced`, note et auteur de la revue, dernier rappel envoyé.
   Un seul document en attente et un seul validé par (Kasiman, type) : index uniques
   partiels. Un envoi remplace l'attente précédente ; une validation remplace l'ancien
   validé.
3. **Contrôle sur BullMQ** : file existante `kasi-dispatch` de driver-api (préfixe
   `kasi-bull`), planificateur `kyc-check` toutes les heures. Chaque passage : documents
   échus passés `expired` (écriture conditionnelle), puis suspension des Kasimen
   concernés, puis, entre 8 h et 21 h, les rappels (une fois par seuil).
4. **Suspension** : un Kasiman `online` ou `offline` dont un document **obligatoire**
   est `expired` sans document validé du même type passe `soft reject`, note « Document
   expiré : … », `documentsSuspendedAt`, retrait de la position Redis, push texte. Un
   Kasiman en course n'est pas interrompu : il est suspendu au passage suivant la fin de
   sa course.
5. **Rappels par push** : texte français, une fois par seuil (J-30, 14, 7, 3, 1 par
   défaut), rejouable (`lastReminderDays` écrit sous condition) et rattrapé si un passage
   est manqué.
6. **Réactivation** : la validation par un opérateur du dernier document bloquant remet
   le Kasiman suspendu à `offline` (il se remet en ligne lui-même).
7. **Garde** : le Kasiman ne peut plus se poser `online`/`offline` depuis un statut
   d'inscription, de refus ou de blocage, ni `online` avec un document obligatoire
   expiré.

## 4. Contrat mobile (ajouts seulement)

driver-api :
- types `DriverDocumentType`, `DriverDocument`, énumération `DriverDocumentStatus` ;
- requêtes `driverDocumentTypes` (catalogue actif) et `driverDocuments` (documents
  courants du Kasiman : en attente, validés, expirés, refusés) ;
- mutation `submitDriverDocument(input: { typeId, mediaId, number, expiresAt })` :
  `mediaId` vient de `POST /upload_document`, inchangé.

Rien de renommé ni retiré : `documents`, `upload_document`, `setDocumentsOnDriver` et
le flux d'inscription restent tels quels. Aucune valeur d'énumération nouvelle dans
`DriverStatus`. Changements de comportement visibles par les apps installées :
- `updateOneDriver(status: Online)` d'un Kasiman suspendu ou non validé est ignoré
  (le statut renvoyé reste le vrai, l'app affiche l'écran correspondant) ;
- nouvelles push texte (rappel, suspension), sans clé de traduction.

admin-api (panel seulement) : `driverDocumentTypes`, `driverDocuments(driverId)`,
`expiringDriverDocuments(withinDays)`, `createDriverDocumentType`,
`updateDriverDocumentType`, `createDriverDocument` (l'opérateur type un fichier déjà
envoyé par l'ancienne app, validé d'emblée), `reviewDriverDocument`. Permissions
`Drivers_View` et `Drivers_Edit` existantes.

## 5. Incréments

| # | Contenu | Validation | Estimation |
|---|---|---|---|
| K1 | Backend : migration, modèle, requêtes et mutations, contrôle `kyc-check`, suspension, rappels, réactivation, garde du statut | Banc d'intégration | 4 à 5 j |
| K2 | Panel : catalogue, documents du Kasiman (typer les envois de l'ancienne app, valider, refuser, échéances), liste « expire bientôt » | Captures, E2E local | 4 à 5 j |
| K3 | driver-app : écran « Mes documents » (envoi par type, date, état), inscription par type ; l'ancien flux reste lisible | Téléphone réel, ancienne version | 5 à 7 j |
| K4 | SMS à la suspension et à J-7 ; documents obligatoires manquants bloquants à l'approbation des nouveaux Kasimen ; portée par véhicule avec `p2-vehicules` | Banc, téléphone | 2 à 3 j |

Total : 15 à 20 j, cohérent avec `lot-kyc` (2 à 3 semaines).

## 6. Questions tranchées (à revoir)

| # | Question | Recommandation appliquée |
|---|---|---|
| Q1 | Documents exigés (**juridique**) | Hypothèse la plus prudente, **à confirmer par l'utilisateur** : permis, carte grise, assurance, pièce d'identité **et** visite technique, tous obligatoires, pour moto, taxi et camionnette. Date d'expiration exigée partout sauf la carte grise. La visite technique n'était pas dans la liste reçue : semée par prudence (transport de personnes). |
| Q2 | Portée par type de véhicule | Aucune en K1 : Kasi n'a pas de type de véhicule (`p2-vehicules` à faire). Mêmes documents pour tous ; catégorie du permis contrôlée par l'opérateur. Colonne de portée avec `p2-vehicules` (K4). |
| Q3 | Un document manquant suspend-il ? | **Non** : seule l'expiration d'un document obligatoire fourni suspend. Sinon toute la flotte actuelle, sans document typé, serait suspendue au premier passage. Le manquant bloquera l'approbation des nouveaux en K4. |
| Q4 | Statut de suspension | `soft reject` + note + `documentsSuspendedAt` : écran déjà géré par l'app installée (renvoi des documents). Pas de valeur nouvelle dans `DriverStatus`. |
| Q5 | Un renouvellement en attente protège-t-il ? | **Non** : seul un document validé protège. Les rappels dès J-30 laissent le temps de le faire valider. |
| Q6 | Rappels | Push texte français, J-30, 14, 7, 3, 1 (réglable par type), une fois par seuil, entre 8 h et 21 h (Dakar = UTC). |
| Q7 | Fréquence du contrôle | Toutes les heures pour l'expiration et la suspension (rattrape le Kasiman en course) ; les rappels ne partent qu'une fois par seuil. L'échéance reste au jour. |
| Q8 | Réactivation | Automatique (`offline`) quand l'opérateur valide le dernier document bloquant ; sinon reste suspendu. |
| Q9 | Faille du statut posé par le Kasiman | Corrigée : `online`/`offline` refusés hors `online`, `offline`, `in service`, et `online` refusé avec un document obligatoire expiré. `pending approval` reste permis (inscription de l'app installée). |
| Q10 | SMS | En K4, à la suspension et à J-7 seulement (coût), par le fournisseur SMS existant. |
| Q11 | Fichiers de l'ancienne app, non typés | L'opérateur les type depuis le panel (`createDriverDocument`, validé d'emblée) ; K3 ajoute l'envoi typé. |
| Q12 | Où tourne le contrôle | driver-api, file `kasi-dispatch` existante (un seul consommateur, déjà là) ; pas de seconde file ni de BullMQ dans admin-api. |
