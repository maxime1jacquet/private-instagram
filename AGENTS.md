# PocketBase + Angular starter

## Objectif et décisions

Starter personnel avec deux domaines de développement : `api/` (PocketBase) et `front/` (Angular).
Docker Compose sert au développement ; le Dockerfile par défaut produit une image Cloud Run avec Angular statique.
Cloud Run avec scale à zéro est demandé. Le montage SQLite sur GCS FUSE reste expérimental,
avec risque accepté de perte/corruption. Ne jamais prétendre que max=1 élimine ce risque.

## Sources à lire

- `Readme.md` : démarrage et commandes.
- `front/README.md` : architecture et périmètre auth.
- `api/README.md` : migrations, hooks, règles.
- `docs/cloud-run.md` : création GCP, OIDC, releases.
- `docs/storage.md` : compromis de persistance et sauvegardes.

## Stack et structure

Angular 22 standalone, SDK PocketBase 0.28.1, PocketBase 0.40.4, Angular Material 22, SCSS et Reactive Forms.
Node 24.15.0 dans `front/.nvmrc` et Docker ; dépendances exactes reproduites avec `npm ci`.

- `front/src/app/domain/auth/` : modèles, adaptateur data-access, service de session, guards, pages et formulaire.
- `front/src/app/domain/voyages/` : lecture des collections `trips`, `posts`, `images`, pages protégées et cartes Material.
- `front/src/app/domain/account/` : page protégée de démonstration.
- `front/src/app/core/pocketbase/` : instance injectable du SDK, origine courante.
- `front/src/stylesheets/` : variables et utilitaires SCSS.
- `api/pb_hooks/`, `api/pb_migrations/` : code API actif et versionné.
- `api/pb_data/` : données privées ignorées.
- `api/pb_public/` : fichiers Angular générés et ignorés, aucune source manuelle.
- `api/examples/` : exemples historiques 0.22, non exécutés.
- `scripts/deploy.sh` : script de release Bash partagé avec GitHub Actions.

## Commandes

```sh
docker compose up
docker compose exec front npm test -- --watch=false
docker compose exec front npm run build
docker compose exec front npm run build:api
docker compose restart api
docker compose config --quiet
docker build --target production -t pocketbase-angular .
bash -n scripts/deploy.sh
sh -n api/entrypoint.sh
```

Avec Node sur l’hôte : `cd front && npm ci`, puis `npm start`, `npm test -- --watch=false`, `npm run build`.
Le proxy vise 8090 sur l’hôte, `api:8080` dans Compose.
Si RTK est installé, préfixer les commandes shell par `rtk` ou `rtk proxy`
(convention locale de travail ; RTK n’est pas un prérequis de Docker/CI).

## Conventions Angular

- Standalone explicite, `ChangeDetectionStrategy.OnPush`, DI avec `inject()`.
- Templates/SCSS co-localisés ; control flow `@if/@for/@switch`, `track` obligatoire.
- Inputs/outputs signal ; état public en lecture seule.
- Pas d’HTTP/SDK dans les composants. Flux formulaire → page → service → adaptateur API.
- Les modèles auth restent indépendants du SDK.
- La séparation `domain/auth` est une demande explicite : conserver l’adaptateur auth dans `domain/auth/data-access/`.
- Ajouter un domaine par fonctionnalité. NgRx n’est pas nécessaire au socle actuel.
- Styles BEM, un bloc par composant, `@use`, couleurs en variables, propriétés alphabétiques.
- Typographie en px, titres avec `fluid()`, breakpoints via mixin projet.
- Conserver l’encapsulation et un focus visible, labels et erreurs accessibles.
- Auth par prénom unique/mot de passe (e-mail à l’inscription) ; SMTP, OAuth, reset et validation d’e-mail sont des extensions projet.

## Données et sécurité applicative

- Les guards contrôlent la navigation ; les règles PocketBase contrôlent les données.
- Aucun secret, JWT réel ou identifiant superuser dans le code, les tests ou la documentation.
- La session utilisateur utilise la clé localStorage `starter_auth` ; ne pas la partager avec le dashboard.
- Générer/relire les migrations en local et les versionner. Éviter d’éditer le schéma en ligne.
- Ne jamais effacer `pb_data`, remplacer les données ou restaurer une sauvegarde sans demande explicite.
- Les tests de fumée créent puis suppriment des comptes et ciblent seulement un serveur local isolé.
- Réserver un bucket distinct à chaque service/environnement.
- Monter uniquement `/pb/pb_data` ; monter `/pb` masquerait le code livré.
- Les sauvegardes PocketBase doivent être téléchargées hors du stockage actif et leur restauration vérifiée.
- Le cron PocketBase ne fonctionne pas à zéro instance.

## CI/CD

`Check` s’exécute sur PR et push main. `Deploy a release` se déclenche sur `projet-*.*.*`,
puis valide strictement `projet-X.Y.Z`. Ne pas déclencher de déploiement sur un push main.
Le script exige un checkout propre au commit du tag, construit linux/amd64 et déploie par digest.
OIDC et variables GitHub remplacent les clés JSON. Voir les huit variables dans `docs/cloud-run.md`.
Adapter ensemble workflow, regex du script et condition OIDC si le préfixe change.
Un rollback d’image ne rétablit pas le schéma de la base.

## Vérification

Tester les changements de session/règles d’accès avec les tests ciblés et un PocketBase local isolé.
Pour Docker : vérifier le build final, les routes Angular profondes, /api/health et /_/.
Le workflow Check exécute `scripts/smoke-test.mjs` après construction du conteneur.
Ne pas présenter les tests locaux comme une validation Cloud Run/IAM/FUSE.
Ne pas créer de ressources GCP ni pousser de release sans demande de déploiement.

## Yoozly Standards Reference

- `angular-component-yoozly` : composants standalone, injection, signals et séparation API.
- `angular-scss-yoozly` : styles BEM, variables, responsive et typographie.
- `init-yoozly` : instructions ancrées dans le dépôt et documentation cohérente.
