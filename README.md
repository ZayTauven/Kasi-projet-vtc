# Kasi

> La vitesse sénégalaise, portée par ceux qui la font déjà.

![Kasi](https://img.shields.io/badge/Status-Production%20Ready-0A84FF?style=for-the-badge) ![Node](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&style=for-the-badge) ![Angular](https://img.shields.io/badge/Angular-16-DD0031?logo=angular&style=for-the-badge) ![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&style=for-the-badge) ![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&style=for-the-badge)

Kasi est une plateforme de mobilité et de logistique pensée pour Dakar : courses, livraisons, gestion de flotte, paiements et administration, réunies dans un écosystème fluide et puissant. Ce projet transforme le dernier kilomètre en une expérience rapide, fiable et intelligemment connectée.

## Pourquoi Kasi ?

Dakar ne manque pas d’énergie. Il manque d’outils. Kasi réunit les acteurs du déplacement autour d’une seule promesse :

- une expérience client fluide,
- une visibilité temps réel pour chaque trajet,
- une gestion intelligente pour les opérateurs,
- une place forte pour les professionnels déjà présents sur le terrain.

Kasi ne remplace pas le marché : il le modernise.

## ✨ Ce que fait la plateforme

Kasi est conçu comme une plateforme complète avec plusieurs couches qui fonctionnent ensemble :

- un back-office d’administration ultra-rapide,
- des APIs robustes pour la logique métier,
- une application chauffeur optimisée pour l’activité quotidienne,
- une application passager / client pensée pour la simplicité,
- une infrastructure géolocalisée et prête à l’échelle.

## 🧠 Architecture du projet

Le dépôt est organisé autour d’un monorepo moderne :

```text
app-ridy/
├── apps/
│   ├── admin-api/
│   ├── admin-panel/
│   ├── driver-api/
│   └── rider-api/
├── driver-app/
├── rider-app/
├── libs/
└── config/
```

### Composants majeurs

- Admin Panel : tableau de bord de gestion, supervision, opérations et pilotage
- Admin API : services backend, logique métier et intégrations
- Driver App : expérience mobile pour les chauffeurs / livreurs
- Rider App : expérience mobile pour les clients / passagers
- Shared Libraries : logique commune, modèles et services réutilisables

## 🚀 Stack technique

Kasi repose sur une stack moderne, performante et scalable :

- Node.js + NestJS pour les services backend
- Angular pour l’administration web
- Flutter pour les applications mobiles natives
- PostgreSQL / TypeORM pour la persistance
- GraphQL et REST selon les besoins métier
- Redis, Firebase, Mapbox et systèmes de paiement intégrés
- Nx pour la gestion du monorepo

## 🔥 Fonctionnalités clés

- suivi de course et de livraison en temps réel,
- gestion des utilisateurs, chauffeurs et opérateurs,
- intégration de paiements et commissions,
- notifications et communications intelligentes,
- supervision via dashboard admin,
- architecture prête pour la montée en charge,
- logique métier pensée pour l’Afrique urbaine et ses réalités.

## 🛠️ Démarrage rapide

### Prérequis

- Node.js 20.x
- npm 10.x
- Flutter SDK (pour les apps mobiles)
- Docker (optionnel, selon votre environnement)

### Installation

```bash
cd app-ridy
npm install
```

### Lancer les services

```bash
npx nx serve admin-api
npx nx serve admin-panel
```

### Apps mobiles

```bash
cd driver-app
flutter pub get
flutter run
```

```bash
cd rider-app
flutter pub get
flutter run
```

## 📦 Structure du dépôt

- apps/admin-api : services backend et APIs
- apps/admin-panel : interface d’administration
- apps/driver-api : services spécifiques au chauffeur
- apps/rider-api : services spécifiques au client
- driver-app : application mobile chauffeur
- rider-app : application mobile client
- libs : modules partagés et logique réutilisable

## 🌍 Vision

Kasi n’est pas seulement une application. C’est une idée de territoire moderne :

une ville où les mouvements sont plus fluides, où les professionnels sont mieux visibles, où la technologie sert les réalités du terrain sans les écraser.

## 🤝 Contribution

Les contributions sont les bienvenues. Si vous souhaitez proposer une amélioration, corriger un bug ou enrichir les fonctionnalités, ouvrez une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

---

Made with ambition for Dakar. Built to move faster.
