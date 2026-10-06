# Front Angular

Application Angular standalone, SCSS, routing chargé à la demande, sans SSR.
Angular produit des fichiers statiques servis par PocketBase dans l’image finale.

## Développer

Depuis la racine : `docker compose up`, puis http://localhost:4200.

Ou avec Node sur l’hôte :

```sh
# Depuis la racine
docker compose up -d api
cd front
nvm install
nvm use
npm ci
npm start
```

`.nvmrc` fixe Node 24.15.0. Ne pas lancer simultanément les deux serveurs Angular sur le même port.
Le proxy par défaut vise `http://127.0.0.1:8090` ; sur Docker Compose, `PB_PROXY_TARGET=http://api:8080`.
Si le port API change, définir `PB_PROXY_TARGET` pour le serveur Angular lancé sur l’hôte.

## Architecture

```text
src/app/
  core/pocketbase/pocketbase.token.ts
  domain/
    auth/
      models/          # Types sans dépendance au SDK
      data-access/     # Seul adaptateur auth qui connaît PocketBase
      services/        # Session, inscription + connexion, état signal
      guards/          # Contrôle de navigation
      components/      # Formulaire de présentation : inputs/outputs
      pages/           # Coordination formulaire / service / routeur
      auth.routes.ts   # /auth/login et /auth/register
    voyages/          # Liste des voyages, étapes, texte et photos PocketBase
    account/
      pages/           # /account : exemple d’utilisation de la session
```

Flux : `AuthFormComponent → AuthPageComponent → AuthService → AuthApiService → PocketBase`.

Le formulaire valide les champs et émet des identifiants ; il ne fait aucun appel réseau.
Le service gère les cas d’usage, l’état en lecture seule et la session.
L’adaptateur traduit les réponses SDK en modèles du domaine et expose des Observable.
Les futures fonctionnalités disposent de leur propre `domain/<feature>/` ; ne pas les ajouter au domaine auth.
Le dossier `core/` ne contient que les dépendances communes.

## Authentification incluse

- Inscription avec prénom unique, e-mail et mot de passe, confirmation, minimum 10 caractères.
- Connexion par prénom/mot de passe ; le champ PocketBase `name` est l’identité unique.
- Connexion automatique après inscription ; message adapté si seule cette seconde étape échoue.
- Connexion, déconnexion, restauration de session avec `authRefresh` au rechargement.
- Protection de `/account`, redirection des utilisateurs connectés hors des pages auth.
- Erreurs en français, état d’attente et prévention des soumissions en double.

Le SDK stocke la session dans `localStorage` sous `starter_auth`, séparément du dashboard.
Aucun identifiant superuser ni secret serveur ne doit apparaître dans Angular.
Le JWT reste accessible au JavaScript : éviter toute injection HTML non maîtrisée.
Une déconnexion efface la session locale ; elle ne révoque pas une copie du JWT déjà émise.

Les guards ne sont pas des permissions serveur. La migration PocketBase applique les règles d’accès réelles :
un utilisateur peut créer son compte puis lire/modifier/supprimer uniquement celui-ci.
La liste publique des utilisateurs est filtrée et `manageRule` reste verrouillée.
L’inscription est publique par défaut : changer cette règle pour un projet sur invitation.

La validation d’e-mail, le mot de passe oublié, OAuth et MFA ne font pas partie de ce socle.
Ils nécessitent une décision projet et, pour les e-mails, une configuration SMTP.
Aucun rôle métier supplémentaire n’est exposé à l’inscription.

## URL de l’API

L’instance SDK utilise l’origine courante du navigateur.
En développement, `proxy.conf.cjs` redirige `/api/**` vers PocketBase.
En production, les mêmes chemins atteignent PocketBase directement.
Aucune URL Cloud Run à coder dans les environnements Angular.

L’administration reste sur le port PocketBase en local (`8090/_/`).
Le proxy sert au développement ; il n’est pas embarqué dans l’image de production.

## Style et conventions

Composants standalone explicites, `OnPush`, `inject()`, signals, `input()/output()` et control flow moderne.
Templates et SCSS co-localisés ; pas de requêtes HTTP dans les composants.
Les styles utilisent BEM, `@use`, variables centralisées, propriétés alphabétiques,
titres `fluid()` et mixins de breakpoints dans `src/stylesheets/`.
L’encapsulation Angular reste activée.

Les formulaires utilisent Reactive Forms. Le starter n’a pas besoin d’un store NgRx supplémentaire.
Les dépendances sont verrouillées par `package-lock.json` ; utiliser `npm ci` pour reproduire l’installation.

## Construire et tester

```sh
npm test -- --watch=false
npm run build
npm run format
npm run build:api
```

`npm run build` génère `dist/front/browser/`.
`npm run build:api` construit puis remplace le contenu généré de `../api/pb_public/` :
ce répertoire est réservé aux sorties de compilation. Écrire les assets sources dans `front/public/`.
Les fichiers générés ne sont pas versionnés.

Le Dockerfile réalise automatiquement cette compilation/copie pendant le build de production.
Les tests couvrent le refus d’une confirmation différente, la restauration d’un JWT rejeté,
les erreurs d’inscription, l’échec de connexion après inscription et les doubles soumissions.

## Carnets de voyage

Après connexion, l’accueil redirige vers `/voyages`. Les pages protégées sont :

- `/voyages` : cartes des collections `trips` (titre `name`, première photo en couverture).
- `/voyages/:voyageId` : étapes `posts` filtrées par `trip`, dans l’ordre de création.
- `/voyages/:voyageId/etapes/:etapeId` : contenu `description` et photos `images` filtrées par `post`.

Ces collections existantes correspondent à `data/pb_schema.json` ; elles doivent être présentes
sur le serveur PocketBase cible. Le front ne crée ni ne modifie les données ou les règles.
Les couvertures utilisent les miniatures `300x150` et les galeries les fichiers originaux.
Le HTML de l’éditeur est assaini par Angular, sans contournement du sanitizer.
Angular Material fournit les cartes, boutons, barre de navigation, champs et indicateurs de chargement.
Le contenu est centré dans un conteneur de 800 px maximum, avec une colonne sur mobile.
