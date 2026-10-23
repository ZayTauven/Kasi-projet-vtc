# Fiche de conception : motifs d'annulation (`p3-mesures` M4)

Point du référentiel : `p3-mesures`, indicateur 4 (« annulations : les 5 motifs les plus
fréquents », `docs/fiche-mesures-pilote.md` §3). Pas de point nouveau : ce lot rend mesurable
un indicateur déjà validé. Porteurs : `kasi-backend-services` (API), `kasi-mobile-apps` (deux
apps), `kasi-admin-panel` (répartiteur). Reprise BetterSuite : l'idée seulement (arguments
facultatifs et requête `cancelReasons`), pas son code. Fiche rédigée par la session
principale le 22 octobre 2026. Statut : **validée par l'utilisateur le 22 octobre 2026, telle
quelle** (§6 : motif obligatoire, catalogue du §3, pas de texte libre).

**Pourquoi avant le pilote** : sans motif, l'écran « Pilote » range toutes les annulations sous
« Sans motif ». On saura combien de clients annulent, jamais pourquoi (trop d'attente, Kasiman
trop loin, erreur d'adresse). Or le bilan du pilote (`p3-bilan`) doit dire quoi corriger.
Les apps du pilote seront installées une fois ; une version sans motif laisserait les premières
semaines muettes.

## 1. Constat (vérifié dans le code le 22 octobre 2026)

**Le catalogue existe déjà.** Table `order_cancel_reason` (`title`, `isEnabled`, `userType` :
`Rider`, `Driver`, `Operator`), gérée dans le panel (Gestion › Motifs d'annulation). La colonne
`request.cancelReasonId` existe. Base locale : 11 motifs (4 Kasiman, 4 client, 3 opérateur).

**Personne ne l'écrit.** Aucune des six annulations ne transmet de motif :

| Auteur | Écran de l'app | Appel | Accepte un motif |
|---|---|---|---|
| Client, pendant la recherche | `looking_sheet_view.dart` | `cancelOrder` (sans argument) | Non |
| Client, après attribution | `order_status_sheet_view.dart` | `updateOneOrder`, `status: RiderCanceled` | Non |
| Client, à la facture | `location_selection_parent_view.dart` | `updateOneOrder`, `status: RiderCanceled` | Non |
| Client, réservation | `reservation_list_view.dart` | `cancelBooking(id)` | Non |
| Kasiman | `ride_options_sheet_view.dart` | `updateOneOrder`, `status: DriverCanceled` | Non |
| Opérateur | répartiteur du panel | `cancelOrder(orderId)` (admin-api) | Non |

Les 14 annulations avec motif de la base locale viennent du jeu de démonstration.

**Le socle est prêt.** Depuis `p1-transitions`, chaque annulation est une écriture conditionnelle
(`transitionOrder`), qui accepte des champs supplémentaires (`set`). Le motif s'écrit dans la
même requête que le statut : un rejeu (timeout de 20 s, double appui) ne modifie pas la ligne,
donc ne change pas le motif.

## 2. Ce qu'on change

### API (ajout pur, aucune migration)

- **Lire le catalogue** : une requête `cancelReasons` dans rider-api (motifs `Rider`) et dans
  driver-api (motifs `Driver`), motifs actifs seulement, triés par `id`. Type neuf
  `CancelReason { id, title }` : on n'expose pas `userType`, pour ne pas ajouter d'énumération
  aux apps (règle du contrat mobile).
- **Transmettre le motif** : un argument facultatif `cancelReasonId: ID` sur `cancelOrder` et
  `cancelBooking` (rider-api), un champ facultatif `cancelReasonId` dans `UpdateOrderInput`
  (rider-api et driver-api), un argument facultatif sur `cancelOrder` d'admin-api (motifs
  `Operator`).
- **Écrire** : dans le `set` de la transition d'annulation. Seulement si la ligne change.
- **Motif refusé, annulation jamais bloquée** : un motif inconnu, désactivé ou d'un autre auteur
  est enregistré comme vide, avec un avertissement dans les journaux. Une annulation ne doit
  jamais échouer à cause du motif : un motif peut avoir été désactivé dans le panel entre
  l'affichage et l'envoi.

**Apps déjà installées** : elles n'envoient rien, donc rien ne change pour elles (motif vide,
comme aujourd'hui). Tous les ajouts sont facultatifs : aucun changement cassant.

### Apps

- **Client** : avant chacune des quatre annulations, une feuille « Pourquoi annulez-vous ? »
  avec la liste des motifs, puis la confirmation. Elle remplace la boîte de confirmation
  actuelle, ce qui ne rajoute pas d'étape.
- **Kasiman** : même feuille avant « Annuler la course ».
- **Repli** : si la liste n'arrive pas (réseau, liste vide), l'annulation part sans motif.
  Elle n'est jamais retardée par le motif. La liste est lue à l'ouverture de la feuille, avec
  le délai habituel.
- Libellés : ceux du catalogue (en français, saisis dans le panel), sans traduction côté app.

### Panel

- Répartiteur : choix d'un motif opérateur dans la confirmation d'annulation.
- Fiche de la course : afficher le motif s'il existe (à vérifier : le champ est peut-être déjà
  lu).

## 3. Catalogue de départ proposé

Les libellés de la base locale sont bons. À saisir en production au déploiement (panel) :

| Auteur | Motifs |
|---|---|
| Client | Attente trop longue · Le Kasiman est trop loin · J'ai trouvé un autre moyen · Je me suis trompé d'adresse · Le prix a changé · Autre raison |
| Kasiman | Le client ne répond pas · Adresse de prise en charge introuvable · Colis non conforme à la description · Panne du véhicule · Autre raison |
| Opérateur | Commande en double · Suspicion de fraude · Incident de sécurité · Autre raison |

« Autre raison » garde la mesure honnête : un client pressé ne choisit pas un motif faux.

## 4. Ce qu'on ne fait pas

- **Pas de texte libre** (`cancelReasonNote` chez BetterSuite) : il demanderait une colonne, donc
  une migration, et une relecture humaine. « Autre raison » suffit au pilote. On y reviendra si
  sa part dépasse 20 % des motifs.
- **Pas de frais d'annulation selon le motif** : sujet produit à part.
- Pas de motif pour les courses expirées : elles n'ont pas d'auteur (indicateur 8).

## 5. Tests et découpage

**Banc d'intégration** (`kasi-backend-services`), dans le harnais existant :
- chaque chemin écrit le motif (client avant et après attribution, réservation, Kasiman,
  opérateur) ;
- appel sans motif (app installée) : annulation faite, motif vide ;
- motif désactivé, inconnu, ou d'un autre auteur : annulation faite, motif vide ;
- rejeu avec un autre motif : le premier reste ;
- `pilotCancelReasons` compte ces motifs sous le bon auteur.

**Apps** (`kasi-mobile-apps`) : émulateur puis téléphone réel, avec trois lancements propres par
app (`adb logcat`). Une annulation par chemin, motif vérifié en base. Puis une coupure réseau à
l'ouverture de la feuille : l'annulation doit partir sans motif.

| Incrément | Contenu | Porteur | Effort estimé |
|---|---|---|---|
| A1 | API : requêtes, arguments, écriture, tests du banc | `kasi-backend-services` | 1 jour |
| A2 | Feuille de motifs dans les deux apps, codegen contre le schéma local | `kasi-mobile-apps` | 1,5 à 2 jours |
| A3 | Répartiteur et fiche de course du panel | `kasi-admin-panel` | 0,5 jour |

Ordre : A1 d'abord (le codegen des apps lit son schéma), puis A2 et A3 en parallèle. Au
déploiement : le backend avant les apps, comme toujours.

## 6. À décider

1. **Motif obligatoire dans l'app ?** Proposé : oui, un choix d'un appui, « Autre raison »
   comprise. Facultatif, la plupart des clients passeraient et l'indicateur resterait vide.
2. **Catalogue de départ** (§3) : à valider ou amender. Il se change ensuite dans le panel, sans
   déploiement.
3. **Pas de texte libre au pilote** (§4) : à confirmer.
