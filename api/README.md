# API PocketBase

PocketBase 0.40.4 est téléchargé et vérifié par SHA-256 dans le Dockerfile.
L’image utilise le binaire officiel ; aucun projet Go personnalisé n’est nécessaire.

- `pb_hooks/` : extensions JavaScript actives, rechargées avec `PB_DEV=true`.
- `pb_migrations/` : schéma/règles versionnés, exécutés au démarrage.
- `pb_data/` : SQLite, uploads, paramètres et types générés, jamais versionnés.
- `pb_public/` : build Angular généré ; sources dans `front/`.
- `examples/legacy-pb-hooks/` : exemples PocketBase 0.22 d’origine, inactifs.
- `entrypoint.sh` : transmet le port `PORT` à PocketBase et exécute le binaire avec `exec` pour recevoir les signaux d’arrêt.

Démarrer : `docker compose up api`. L’API écoute sur http://localhost:8090/api/health ;
le dashboard sur http://localhost:8090/_/.

La migration initiale configure la collection auth `users`, des mots de passe d’au moins 10 caractères
et des règles limitant chaque utilisateur à son compte. `manageRule=null` reste verrouillée.
La migration `1791288000_first_name_auth.js` utilise `name` comme identité de connexion,
avec un index unique insensible à la casse ASCII. Les e-mails et mots de passe sont conservés.
Les comptes existants doivent avoir un prénom renseigné ; les doublons de prénoms
(hors casse ASCII) doivent être corrigés avant l’application de la migration.

L’inscription publique est volontaire pour le starter et peut être restreinte par projet.

Les futures règles métier doivent être appliquées ici, même lorsque le front masque une action.
Ne pas mettre de secret ou de compte superuser dans les migrations.
Ne pas exposer `pb_data` ni écrire du code applicatif dans le bucket.

En développement, les changements de collection du dashboard créent automatiquement une migration.
Relire le fichier avant commit. Pour une migration manuelle :

```sh
docker compose exec api /pb/pocketbase migrate create "description" \
  --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations
docker compose restart api
```

En production, `PB_AUTOMIGRATE=false` empêche la génération de fichiers depuis le dashboard ;
les migrations existantes continuent à s’appliquer. Le schéma doit évoluer par Git.

Pour le premier superuser et les sauvegardes, voir le [README racine](../Readme.md).
Les limites de Cloud Run/FUSE sont détaillées dans [docs/storage.md](../docs/storage.md).
