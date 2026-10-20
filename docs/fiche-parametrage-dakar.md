# Fiche de paramétrage : région de Dakar (`p2-parametrage`)

Point du référentiel : `p2-parametrage` (phase 2, porteur : équipe produit), lié à `act-dakar`,
`p2-vehicules` et `d-commission`. Décision de l'utilisateur du 20 octobre 2026 : **commencer par la
région de Dakar**. Fiche rédigée par la session principale le même jour, à partir de la base
locale (jeu de démo du mémoire). Statut : **appliqué en local**. Le 20 octobre, l'utilisateur a validé l'arrondi des prix et confié
le reste à la session principale (« des paramètres standards, modifiables en production ») : §4.

## 1. Ce qui existait

Le jeu de démo découpait Dakar en 5 zones rectangulaires actives, plus le corridor AIBD fermé.
Testées sur 24 quartiers, **8 quartiers de la région n'étaient couverts par aucune zone** :
Mermoz, Sacré-Cœur, Ouakam, HLM, Hann, Keur Massar, Mbao et Sébikotane. Toute commande partie
de là était refusée (`REGION_UNSUPPORTED`). Kasi Moto Express n'était pas ouvert au Plateau.

## 2. Ce qui est appliqué en local

Script rejouable : `tools/parametrage/dakar.sql`. Contour : `tools/parametrage/region-dakar.geojson`.

| Étape | Effet |
|---|---|
| Région | Une seule région, « Région de Dakar » (XOF), aux limites administratives : OpenStreetMap, relation 2892079, terre ferme, 78 points, environ 620 km². Gorée et les îlots ne sont pas desservis. L'AIBD et Thiès sont hors région |
| Services | Les 5 services sont ouverts sur toute la région |
| Zones de démo | Les 5 rectangles sont désactivés, pas supprimés (historique des courses de démo) |
| Véhicules (`p2-vehicules`) | Kasi Moto Livraison et Express : moto. Kasi Ville et Ville Confort : voiture. Kasi Tournée : moto et camionnette (à valider, §4). Un Kasiman sans type déclaré reste accepté partout |
| Nom | Catégorie « Kasi Pro — entreprises » renommée « Kasi Entreprises », puisque « Kasi Pro » est l'app Kasiman |

Vérifié sur la stack locale :
- le script, passé deux fois, ne change rien la seconde fois ;
- les quartiers testés tombent dans la région, l'AIBD et Thiès en dehors ;
- `getFare` depuis Mermoz renvoie un prix pour les 5 services.

Sauvegarde préalable : `archive/sauvegardes/kasi-avant-parametrage-dakar-20261020.dump`.

## 3. Grille actuelle (jeu de démo)

Exemple : Mermoz → Plateau, environ 5 km.

| Service | Base | Par 100 m | Par minute | Minimum | Commission | Prix obtenu |
|---|---|---|---|---|---|---|
| Kasi Moto Livraison | 1 000 | 10 | 8 | 1 000 | 15 % | 2 003 |
| Kasi Moto Express | 1 500 | 14 | 12 | 2 000 | 18 % | 2 921 |
| Kasi Ville | 700 | 11 | 9 | 1 200 | 12 % | 1 808 |
| Kasi Ville Confort | 1 500 | 18 | 14 | 2 500 | 15 % | 3 297 |
| Kasi Tournée | 5 000 | 9 | 7 | 5 000 | 10 % | 5 898 |

Forfaits de zone existants : Plateau ↔ AIBD 15 000, Plateau ↔ Almadies 4 500, Plateau ↔
Guédiawaye 3 500, Yoff ↔ marché Sandaga 3 000. Plafond de dette des Kasimen : 10 000 FCFA
(alerte à 7 500).

## 4. Valeurs retenues (20 octobre 2026)

Arrondi décidé par l'utilisateur ; le reste a été choisi par la session principale, à sa demande.
Tout se modifie par le panel.

| Sujet | Retenu | Pourquoi |
|---|---|---|
| Arrondi | **50 FCFA** sur tous les services, **après coupon aussi** (code : `fare-quote.service.ts`) | Pilote en espèces : le Kasiman doit pouvoir rendre la monnaie. Mermoz → Plateau : 2 003 → 2 000, 1 808 → 1 800 |
| Commission | 15 % (Kasi Moto Livraison et Express, Kasi Ville Confort), 12 % (Kasi Ville, Kasi Tournée) | Repère de lancement 12 à 15 % (`d-commission`) ; le taxi est le marché le plus disputé, la tournée se vend au volume |
| Grille | Formules du jeu de démo inchangées | Les services courants restent entre 1 000 et 3 000 FCFA. Kasi Ville Confort (3 300) et Kasi Tournée (5 900) en sortent volontairement : confort et tournée multi-arrêts |
| Forfaits de zone | Seul Plateau ↔ AIBD (15 000) reste lié | Les 3 forfaits urbains coûtaient plus cher que la formule (Plateau ↔ Almadies : 4 500 contre environ 2 000). Liens retirés, forfaits gardés |
| Camionnette | Pas de service client pour le pilote ; la camionnette sert les tournées d'entreprise | Pilote d'abord : moto, taxi et B2B. Un service client se crée par le panel si la demande apparaît |
| Documents | Visite technique exigée pour les voitures et camionnettes seulement ; permis, carte grise, assurance et pièce d'identité pour tous | La visite technique des motos n'est pas d'usage. Liste légale à confirmer |
| Plafond de dette | 10 000 FCFA (alerte à 7 500), inchangé | Environ 30 courses de commission à 15 % sur 2 000 FCFA avant blocage |
| Rayons de recherche | Inchangés (6 à 15 km) | Les vagues s'arrêtent à ces rayons |
| Corridor AIBD | Toujours fermé au départ ; on peut s'y rendre depuis Dakar | Dakar d'abord : une prise en charge à l'aéroport viendra avec l'ouverture de la région de Thiès |

## 5. En production (début de la phase 3)

- Relire d'abord les régions et les services réels.
- Les étapes 3 à 5 du script visent les noms du jeu de démo : sans ces noms, elles ne font rien.
- Appliquer les valeurs validées au §4, par le panel ou par une version du script.
- Le contour est sous licence ODbL : garder l'attribution aux contributeurs d'OpenStreetMap si on
  l'affiche sur une carte.
