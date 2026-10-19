# Kasi — repère de direction

Ce fichier n'est pas une documentation exhaustive : c'est un ancrage court,
à relire en début de session. Le détail vit dans `KASI_DECISIONS.md`, la
mémoire persistante du projet, et les agents/skills `.claude/`.

## Direction produit

**Depuis le 2026-07-22, Kasi ne vise plus la parité fonctionnelle avec
Ridy.** `app-kasi` reste l'héritage de code technique sur lequel le
produit est construit, mais la cible produit est **la vision définie dans
`KASI_NARRATIVE_VISION.md`** :

- **Kasiman** : une identité unique, pas un "chauffeur" et un "livreur"
  séparés — un badge, une réputation, un revenu.
- **Trois usages, une seule infrastructure** : personnes qui bougent,
  colis qui bougent, flotte pour compte d'entreprise.
- **Digitaliser l'existant** plutôt que recruter une flotte neuve — le
  taximan de quartier doit pouvoir rejoindre Kasi avec son véhicule.
- **La promesse client** : rapidité, suivi temps réel, sécurité.

Une fonctionnalité héritée d'app-kasi, ou inspirée de Ridy, n'est jamais
justifiée par "Ridy le fait" — seule la vision ci-dessus tranche. L'ancien
backlog de parité (P0→P6, comparatif Ridy v3) est archivé dans
`archive/phase-1-migration-ridy/` et `memory/archive/` : conservé pour
l'historique, plus la référence active.

## Stack confirmée (été 2026)

- **Backend** (`admin-api`, `driver-api`, `rider-api`, monorepo Nx 23) :
  NestJS 11, Fastify 5, Apollo Server 5, TypeORM 1.0.
- **`admin-panel`** : Angular 22.0.7, Apollo Client 4 / apollo-angular 14,
  ng-zorro-antd 21.3.3.
- **`driver-app` / `rider-app`** : Flutter/BLoC, Firebase modernisé,
  geolocator 14, flutter_map 8.
- **Infra** : self-hosting **en production** sur `kasigroupe.tech` (VPS,
  Docker Compose) — pas un objectif, une base à opérer.
- **Paiement Sénégal** : Bictorys (Wave + Orange Money), espèces par
  défaut en attendant l'intégration.
- Design system v3 (pétrole/orange, Bricolage Grotesque/DM Sans) appliqué
  à l'admin-panel et aux deux apps mobiles.

## Référentiel du chantier (depuis le 2026-09-28)

Le périmètre du projet (existant, feuille de route, cible) est défini par
un référentiel de cinq pages, tenu **hors de ce dépôt** dans
`../referentiel/` (miroir Markdown lisible dans `../referentiel/miroir/`).
Le `CLAUDE.md` du dossier parent (`../CLAUDE.md`) en donne les règles :
tout travail cite le code d'un point du référentiel et suit l'ordre de la
feuille de route (principe « pilote d'abord »).

## Agents et skills

Ils vivent dans le `.claude/` du dossier parent, pas dans ce dépôt. Rôles,
lots portés et skills actives : `../.claude/agents/README-agents.md`.

## Sources de vérité vivantes

1. Le référentiel (`../referentiel/`) — le périmètre du chantier.
2. `KASI_NARRATIVE_VISION.md` (racine) — la cible produit.
3. `KASI_DECISIONS.md` (racine) — journal des décisions structurantes,
   pivoté le 2026-07-22 (voir l'entrée en tête).
4. Mémoire persistante du projet — à consulter et enrichir en continu.

Il n'y a plus de script d'audit à relancer pour "découvrir" la stack :
elle est connue. Un doute sur son état actuel se lève en lisant le code
et ces sources, pas en supposant.
