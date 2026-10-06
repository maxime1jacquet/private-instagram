# PocketBase + Angular sur Cloud Run

Starter personnel dérivé de [rodydavis/pocketbase-cloudrun](https://github.com/rodydavis/pocketbase-cloudrun).
Deux dossiers métier : **api/** pour PocketBase, **front/** pour Angular.
En local, `docker compose up` démarre les deux serveurs. En ligne, une seule image sert Angular et l’API PocketBase.

> **Hébergement expérimental accepté pour ce starter.** Cloud Run monte les données SQLite depuis Cloud Storage FUSE.
> Google déconseille ce stockage pour une base de données : il ne fournit pas les garanties de verrouillage attendues.
> Limiter Cloud Run à une instance ne garantit pas un seul processus pendant les remplacements/déploiements.
> Une perte ou corruption reste possible. Voir [stockage et sauvegardes](docs/storage.md).

## Démarrage local

Prérequis : Docker avec Compose v2 et BuildKit (Docker Desktop convient, Intel ou Apple Silicon).
Aucun Node ni binaire PocketBase n’est nécessaire sur l’hôte.

```sh
docker compose up
```

Le premier démarrage télécharge les dépendances ; attendre le message Angular « Local ».
Les ports peuvent être modifiés avec `.env` à partir de `.env.example`.

| Accès | Adresse par défaut |
| --- | --- |
| Application Angular | http://localhost:4200 |
| Voyages (après connexion) | http://localhost:4200/voyages |
| Inscription | http://localhost:4200/auth/register |
| API / santé | http://localhost:8090/api/health |
| Administration PocketBase | http://localhost:8090/_/ |

Le front utilise `/api`, redirigé vers `http://api:8080` par le proxy du serveur Angular.
Les changements Angular et hooks PocketBase sont rechargés en développement.
Les modifications du schéma dans le dashboard génèrent des fichiers dans `api/pb_migrations/` à relire et versionner.

Créer un compte depuis le formulaire Angular ne crée **pas** un administrateur.
Pour le premier superuser, ouvrir le lien d’installation affiché par `docker compose logs api`
(remplacer son hôte/port par `localhost:8090`). Ce lien contient un jeton privé : ne pas le partager.

```sh
docker compose up -d          # En arrière-plan
docker compose logs -f front  # Logs Angular
docker compose restart api   # Après une nouvelle migration ajoutée manuellement
docker compose down          # Arrêter, les données restent dans api/pb_data/
```

Les fichiers SQLite, les fichiers envoyés et les types JSVM générés restent dans `api/pb_data/`, ignoré par Git.
Les volumes `front_node_modules` et `front_angular_cache` isolent les dépendances Linux de celles de l’hôte.
Le service front refait `npm ci` à chaque démarrage : redémarrer `front` après une modification du lockfile.

Sur Linux, les dossiers `api/pb_data` et `api/pb_migrations` doivent être accessibles en écriture à l’UID/GID `10001`
utilisé par l’image. Ajuster leur propriétaire/groupe local si nécessaire ; Docker Desktop gère le partage macOS.

## Structure

```text
api/
  entrypoint.sh             # Configuration du processus et du port Cloud Run
  pb_hooks/                 # Hooks actifs
  pb_migrations/            # Schéma et règles d’accès versionnés
  pb_data/                  # Données locales privées, ignorées
  pb_public/                # Sortie Angular facultative en local, générée
  examples/                 # Anciens exemples 0.22, non exécutés
front/
  src/app/core/pocketbase/   # Instance du SDK
  src/app/domain/auth/      # Formulaires, cas d’usage, adaptateur API, guards
  src/app/domain/account/   # Page protégée de démonstration
  src/stylesheets/          # Variables et utilitaires SCSS
scripts/
  deploy.sh                 # Construction amd64, publication et déploiement
  smoke-test.mjs            # Contrôle fonctionnel d’un conteneur local isolé
docs/
  cloud-run.md              # Initialisation GCP + GitHub Actions
  storage.md                # Limites, sauvegarde et restauration
```

## Image de production en local

Le Dockerfile compile Angular puis copie `front/dist/front/browser/` dans `/pb/pb_public/`.
Seuls PocketBase, les hooks, les migrations et les fichiers statiques restent dans l’image finale.
Node et le serveur Angular ne sont pas exécutés en production.

```sh
docker build -t pocketbase-angular .
docker run --rm -p 127.0.0.1:8080:8080 \
  -v pocketbase-preview:/pb/pb_data pocketbase-angular
```

Ouvrir http://localhost:8080. Le volume de preview est distinct des données Compose.
Le fallback SPA de PocketBase permet de recharger `/auth/login` ou `/account`.
Ne jamais monter un volume sur tout `/pb` : il masquerait le front, les hooks et les migrations de l’image.

Pour produire les fichiers directement dans le dossier public du dépôt :

```sh
docker compose exec front npm run build:api
```

Ou avec Node sur l’hôte : `cd front && npm ci && npm run build:api`.
La construction Docker de production n’a besoin d’aucune copie préalable. Voir le [README Angular](front/README.md).

## Tests et conventions

```sh
docker compose exec front npm test -- --watch=false
docker compose exec front npm run build
docker compose config --quiet
bash -n scripts/deploy.sh
```

Le workflow `Check` teste les formulaires et la session, construit l’image finale,
puis vérifie les routes SPA et l’isolation des comptes contre un PocketBase jetable.
La documentation des conventions agent est dans [AGENTS.md](AGENTS.md).

Versions : Angular 22 (CLI 22.1.8), SDK PocketBase 0.28.1, PocketBase 0.40.4,
Node 24.15.0 dans Docker et `front/.nvmrc`. Le lockfile npm est versionné.
Les mises à jour PocketBase doivent être testées avec les migrations et une copie des données.

## Première mise en ligne

Suivre [la procédure GCP et GitHub Actions](docs/cloud-run.md), qui part d’un projet GCP inexistant.
Les identités GitHub utilisent OIDC / Workload Identity Federation, sans clé JSON persistante.

Une fois les ressources et variables GitHub préparées, committer puis publier un tag :

```sh
git tag projet-0.1.0
git push origin projet-0.1.0
```

Les pushes sur `main` et les pull requests lancent les contrôles.
Seuls les tags exactement conformes à `projet-X.Y.Z` déclenchent une release valide.
Le préfixe est littéral et réutilisable : pour le changer, adapter le workflow, le script et la condition OIDC ensemble.

## Origine et licence

Le dépôt d’origine est publié sous licence Apache-2.0 ; ses exemples sont conservés.
Les anciens hooks de rendu HTML dans `api/examples/legacy-pb-hooks/` ciblent PocketBase 0.22 ;
ils ne sont ni chargés ni copiés dans l’image.
