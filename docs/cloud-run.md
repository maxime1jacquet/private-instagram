# Première mise en ligne : GCP et GitHub Actions

Cette procédure crée les ressources depuis zéro. Elle est à exécuter par le propriétaire du compte GCP ;
aucune ressource cloud n’est créée par le simple clone ou par `docker compose up`.
Le montage SQLite sur Cloud Storage reste [expérimental](storage.md).

## 1. Préparer les outils et la facturation

Installer une version récente du [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install)
et, pour lire les identifiants GitHub ci-dessous, [GitHub CLI](https://cli.github.com/).
Les builds locaux de release nécessitent Docker avec Buildx. GitHub Actions les fournit.

Créer un compte Google Cloud et un compte de facturation. Les ressources peuvent générer des frais,
même si Cloud Run descend à zéro : stockage, images et opérations restent distincts.
Configurer une alerte budgétaire dans Billing ; une alerte ne bloque pas automatiquement les dépenses.

Les commandes suivantes utilisent Bash. Choisir des noms propres à chaque projet :

```bash
# 30 digit max
export GCP_PROJECT_ID="private-instagram-8926142"
export GCP_REGION="europe-west9"
export GCP_SERVICE="private-instagram"
export GCP_ARTIFACT_REPOSITORY="apps"
export GCP_DATA_BUCKET="$GCP_PROJECT_ID-pocketbase"
export GITHUB_REPOSITORY="maxime1jacquet/private-instagram"
export GCP_RUNTIME_SERVICE_ACCOUNT="pocketbase-runtime@$GCP_PROJECT_ID.iam.gserviceaccount.com"
export GCP_DEPLOY_SERVICE_ACCOUNT="github-deploy@$GCP_PROJECT_ID.iam.gserviceaccount.com"

gcloud auth login
gcloud projects create "$GCP_PROJECT_ID" --name="Private instagram"
gcloud billing accounts list
```

Reporter l’identifiant du compte choisi, puis associer la facturation :

```bash
export BILLING_ACCOUNT_ID="01D57D-A64188-9B610F"
gcloud billing projects link "$GCP_PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID"
gcloud config set project "$GCP_PROJECT_ID"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com

export GCP_PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
```

Les règles d’une organisation GCP peuvent limiter la création de projets, l’accès public ou OIDC.
Dans ce cas, le propriétaire doit adapter ces étapes aux permissions de son organisation.

## 2. Créer le stockage et le registre d’images

```bash
gcloud artifacts repositories create "$GCP_ARTIFACT_REPOSITORY" --project="$GCP_PROJECT_ID" --location="$GCP_REGION" --repository-format=docker

gcloud storage buckets create "gs://$GCP_DATA_BUCKET" --project="$GCP_PROJECT_ID" --location="$GCP_REGION" --uniform-bucket-level-access

gcloud storage buckets update "gs://$GCP_DATA_BUCKET" --public-access-prevention
```

Le bucket reste privé. Un bucket distinct est nécessaire pour chaque service/environnement.
Ne pas y déposer le front, les hooks ni les migrations : ils proviennent de l’image.
Le bucket est monté sur `/pb/pb_data`, avec UID/GID `10001` comme le processus PocketBase.

Pour les sauvegardes, télécharger les archives PocketBase hors de ce bucket.
Voir [sauvegarde/restauration](storage.md). Ne pas considérer le versionnement des objets comme une sauvegarde SQLite.

## 3. Séparer l’identité du service et celle de la CI

```bash
gcloud iam service-accounts create pocketbase-runtime --project="$GCP_PROJECT_ID" --display-name="PocketBase runtime"

gcloud iam service-accounts create github-deploy --project="$GCP_PROJECT_ID" --display-name="GitHub deployment"

gcloud storage buckets add-iam-policy-binding "gs://$GCP_DATA_BUCKET" --member="serviceAccount:$GCP_RUNTIME_SERVICE_ACCOUNT" --role=roles/storage.objectUser

gcloud artifacts repositories add-iam-policy-binding "$GCP_ARTIFACT_REPOSITORY" --project="$GCP_PROJECT_ID" --location="$GCP_REGION" --member="serviceAccount:$GCP_DEPLOY_SERVICE_ACCOUNT" --role=roles/artifactregistry.writer

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:$GCP_DEPLOY_SERVICE_ACCOUNT" --role=roles/run.admin

gcloud iam service-accounts add-iam-policy-binding "$GCP_RUNTIME_SERVICE_ACCOUNT" --project="$GCP_PROJECT_ID" --member="serviceAccount:$GCP_DEPLOY_SERVICE_ACCOUNT" --role=roles/iam.serviceAccountUser
```

Le runtime accède aux objets de son bucket. La CI publie les images et déploie Cloud Run avec cette identité.
Le rôle Run Admin permet aussi au script de rendre le service public.
Ne pas donner un accès public au bucket.

## 4. Connecter GitHub par OIDC

La CI utilise des identifiants temporaires. Aucune clé de service account JSON n’est nécessaire.
Sources : [action Google auth](https://github.com/google-github-actions/auth),
[fédération GitHub/GCP](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).

Se connecter à GitHub et récupérer les identifiants numériques du dépôt et de son propriétaire :

```bash
gh auth login
export GITHUB_REPOSITORY_ID="$(gh api "repos/$GITHUB_REPOSITORY" --jq '.id')"
export GITHUB_OWNER_ID="$(gh api "repos/$GITHUB_REPOSITORY" --jq '.owner.id')"

gcloud iam workload-identity-pools create github --project="$GCP_PROJECT_ID" --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github  --project="$GCP_PROJECT_ID" --location=global --workload-identity-pool=github  --issuer-uri="https://token.actions.githubusercontent.com"  --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id"  --attribute-condition="assertion.repository_id == '$GITHUB_REPOSITORY_ID' && assertion.repository_owner_id == '$GITHUB_OWNER_ID' && assertion.ref.startsWith('refs/tags/projet-')"

gcloud iam service-accounts add-iam-policy-binding "$GCP_DEPLOY_SERVICE_ACCOUNT" --project="$GCP_PROJECT_ID" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository_id/$GITHUB_REPOSITORY_ID"

export GCP_WORKLOAD_IDENTITY_PROVIDER="projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github"
```

La condition restreint la fédération au dépôt, à son propriétaire numérique et aux tags de release.
Un changement de préfixe de tag doit aussi modifier cette condition.
Limiter les droits de création des tags de release aux personnes autorisées dans les règles GitHub du dépôt.
La propagation IAM peut prendre quelques minutes.

## 5. Enregistrer les variables GitHub

Dans GitHub : **Settings → Secrets and variables → Actions → Variables → New repository variable**.
Créer ces huit variables, dont les valeurs viennent des étapes précédentes :

| Variable                         | Valeur                                                |
| -------------------------------- | ----------------------------------------------------- |
| `GCP_PROJECT_ID`                 | Identifiant du projet                                 |
| `GCP_REGION`                     | `europe-west9` dans cet exemple                       |
| `GCP_SERVICE`                    | Nom du service Cloud Run                              |
| `GCP_ARTIFACT_REPOSITORY`        | `apps` dans cet exemple                               |
| `GCP_DATA_BUCKET`                | Nom du bucket, sans `gs://`                           |
| `GCP_RUNTIME_SERVICE_ACCOUNT`    | Adresse du compte runtime                             |
| `GCP_DEPLOY_SERVICE_ACCOUNT`     | Adresse du compte GitHub deploy                       |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Chemin complet `projects/NUMERO/locations/global/...` |

Ces identifiants de ressources ne sont pas des mots de passe.
Les futurs secrets SMTP, OAuth ou métier restent côté PocketBase/GCP, jamais dans Angular.

## 6. Publier la première release

Commencer par committer les fichiers du starter dans **ton propre dépôt GitHub**.
Puis créer un tag sur le commit à déployer :

```bash
git tag projet-0.1.0
git push origin projet-0.1.0
```

Le workflow `Deploy a release` :

1. Valide le tag exact `projet-X.Y.Z`.
2. Installe les dépendances, lance les tests Angular et compile.
3. Obtient l’identité GCP temporaire via OIDC.
4. Appelle `scripts/deploy.sh`.
5. Construit l’image `linux/amd64`, la publie dans Artifact Registry et la déploie par digest.

Le service est créé au premier déploiement. Sa configuration :
minimum 0, maximum 1, 1 vCPU, 512 MiB, concurrence 20, timeout 300 secondes,
CPU alloué aux requêtes, probe de démarrage `/api/health`.
L’application et les routes auth sont publiques ; les données restent protégées par les règles PocketBase.
Il n’y a pas de déploiement sur un simple push de branche.

Le réglage max=1 ne garantit pas l’absence de chevauchement entre processus.
Les déploiements sont sérialisés dans GitHub, sans partage volontaire de trafic entre révisions.

## 7. Créer le premier superuser

Ouvrir l’URL Cloud Run affichée à la fin du job.
Pour l’administration, ajouter `/_/`.

PocketBase affiche un lien d’installation avec jeton dans ses logs tant qu’aucun superuser n’existe.
Consulter les logs du service depuis la console GCP, ou :

```bash
gcloud run services logs read "$GCP_SERVICE" --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --limit=100
```

Conserver le chemin et le jeton du lien affiché, mais remplacer `http://0.0.0.0:8080`
par l’URL HTTPS Cloud Run. Ouvrir ce lien et créer le superuser.
Le lien est privé et temporaire : ne pas le committer, le copier dans une issue ou le partager.
Si nécessaire, provoquer une nouvelle requête après un redémarrage pour obtenir un lien valide.

Une fois connecté au dashboard, renseigner l’URL publique dans les paramètres de l’application.
L’inscription depuis Angular crée un utilisateur ordinaire de la collection `users`, jamais un superuser.

## 8. Utiliser le script depuis son ordinateur

```bash
cp .env.deploy.example .env.deploy
# Éditer les noms de ressources dans .env.deploy
set -a
source .env.deploy
set +a
gcloud auth login
bash scripts/deploy.sh projet-0.1.0
```

Le compte local doit avoir les permissions de publication, de déploiement et d’utilisation du runtime.
Le script utilise l’identité gcloud active ; il ne choisit pas automatiquement le compte de CI.
Il refuse un dépôt modifié, un tag invalide ou un checkout différent du tag demandé.
Il ne charge pas automatiquement `.env.deploy` et ne crée pas les ressources préalables.

## 9. Versions suivantes et rollback

Développer le schéma en local, versionner les migrations et vérifier les tests avant un nouveau tag.
En ligne, les migrations versionnées sont appliquées au démarrage ; `--automigrate=false` désactive
seulement la génération automatique de nouveaux fichiers. Éviter les modifications de schéma directement en ligne :
elles ne seraient pas exportées dans Git et pourraient diverger du starter.

Avant une release avec migration, créer et télécharger une sauvegarde PocketBase.
Un rollback d’image ne restaure pas la base : vérifier la compatibilité des migrations ou restaurer
une sauvegarde dans un environnement isolé avant la bascule. Ne pas supprimer/recréer un tag déjà publié.

## 10. Diagnostic rapide

- **403 pendant OIDC** : vérifier les IDs numériques, le préfixe du tag et la propagation IAM.
- **Publication d’image refusée** : vérifier Artifact Registry Writer sur le dépôt régional.
- **Utilisation du service account refusée** : vérifier Service Account User sur l’identité runtime.
- **Bucket inaccessible** : vérifier son nom, Storage Object User et le montage UID/GID 10001.
- **Le front ne change pas après release** : le volume doit cibler uniquement `/pb/pb_data`.
- **Échec de migration/démarrage** : consulter les logs ; ne pas effacer la base pour masquer l’erreur.
- **Cloud Run reste actif** : vérifier les requêtes, onglets connectés au temps réel et sondes externes.
- **gcloud échoue à charger une commande avec Python 3.9** : mettre à jour le CLI et utiliser une version de Python prise en charge ;
  si nécessaire, définir `CLOUDSDK_PYTHON` vers son exécutable selon la documentation d’installation.

Les commandes cloud et la fédération doivent être vérifiées lors du premier déploiement réel :
les tests locaux ne prouvent pas les permissions IAM ni la fiabilité du montage FUSE.
