# Stockage : compromis du starter personnel

## Décision retenue

Cloud Run avec minimum 0 instance est une contrainte du projet.
Le stockage Cloud Storage FUSE du dépôt d’origine est conservé comme solution **expérimentale**, avec risque accepté.
Ce starter ne garantit ni l’absence de corruption ni la conservation de toutes les écritures.

PocketBase utilise SQLite. Cloud Storage FUSE ne fournit pas un système de fichiers pleinement POSIX
ni le verrouillage attendu ; Google déconseille son usage comme stockage actif de base de données.
Sources : [limitations FUSE](https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/overview#limitations),
[montages Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts#limitations).

Seul `/pb/pb_data` est monté depuis le bucket : base, paramètres et fichiers envoyés.
Les hooks, migrations et le front sont dans l’image, afin qu’une release mette bien le code à jour.

## Mesures et limites

- Minimum 0, maximum 1 au niveau service et révision ; cela réduit la concurrence.
  Ce n’est **pas un verrou** : des instances peuvent se chevaucher lors d’un remplacement ou déploiement.
  [Garanties Cloud Run](https://docs.cloud.google.com/run/docs/about-instance-autoscaling#exceeding_maximum_instances).
- Un bucket de données par service/environnement. Ne jamais faire fonctionner un test local,
  une préproduction ou un autre service sur le bucket de données actif.
- Pas de partage volontaire du trafic entre révisions ; pas de rollback automatique de la base.
- Les déploiements GitHub sont sérialisés, mais cette sérialisation ne verrouille pas les processus Cloud Run.
- Sauvegarder et télécharger une copie hors du stockage actif avant une release importante.
- Les probes et tests locaux valident le démarrage et les règles d’accès ; ils ne valident pas la fiabilité de SQLite sur FUSE.

## Peut-on faire mieux simplement ?

SQLite local + [Litestream vers GCS](https://litestream.io/guides/gcs/) évite d’exécuter SQLite sur FUSE,
mais demande une restauration au démarrage, la coordination des écrivains et une gestion séparée des fichiers envoyés.
La réplication est asynchrone et les dernières écritures peuvent être perdues.
Plusieurs processus répliquant au même emplacement peuvent rendre la restauration impossible.
[Limites Litestream](https://litestream.io/tips/).

Un simple `max-instances=1` ne résout pas cette coordination sur Cloud Run.
Copier le fichier SQLite uniquement à l’arrêt ne suffit pas non plus : Cloud Run laisse un délai limité
et un crash peut empêcher la copie.
[Cycle de vie](https://docs.cloud.google.com/run/docs/container-contract#instance-shutdown).

Filestore ajoute un service persistant et du réseau ; le montage NFS Cloud Run fonctionne sans verrouillage NFS.
Ce n’est pas un remplacement direct à présenter comme une garantie SQLite.
[Documentation NFS](https://docs.cloud.google.com/run/docs/configuring/services/nfs-volume-mounts#limitations).

Pour un futur projet où les données sont importantes, reconsidérer l’hébergement :
PocketBase sur disque persistant adapté, ou backend conçu pour une base distante.
Ce choix sort du compromis scale à zéro / simplicité retenu ici.

## Sauvegarder

Utiliser le dashboard PocketBase, **Settings → Backups**, puis créer une sauvegarde et télécharger le ZIP.
Conserver les archives hors du bucket de données actif, avec une copie locale ou un bucket de sauvegardes dédié.
Le ZIP contient les données et fichiers locaux, mais pas les objets éventuellement stockés via S3.
[Procédure PocketBase](https://pocketbase.io/docs/going-to-production/#backup-and-restore).

Ne pas copier une base SQLite en cours d’écriture avec `cp` ou `gsutil cp`.
Une version d’objet du bucket n’est pas une sauvegarde transactionnelle de l’ensemble base + WAL + fichiers.

Le cron interne PocketBase ne peut pas garantir une sauvegarde quotidienne lorsque Cloud Run est à zéro.
Le starter ne prétend donc pas automatiser une sauvegarde quotidienne : la création, le téléchargement et
la vérification avant release restent explicites.

## Vérifier une restauration en local

1. Télécharger une archive via PocketBase.
2. Construire l’image de la version qui a produit la sauvegarde.
3. Démarrer un conteneur isolé avec un **nouveau** volume local et un port libre.
4. Créer son superuser via le lien d’installation, ouvrir Settings → Backups, importer/restaurer le ZIP.
5. Vérifier connexion, collections, enregistrements et fichiers envoyés.
6. Arrêter le conteneur après vérification. Ne jamais lui monter le bucket actif.

La restauration remet aussi les comptes et paramètres de l’archive.
La version PocketBase doit être compatible avec la sauvegarde.
Si la sauvegarde est déjà corrompue, cette procédure ne la répare pas : tester régulièrement une restauration.

Pour restaurer en ligne, arrêter les écritures et suivre la procédure PocketBase depuis le dashboard.
Ne pas remplacer manuellement les fichiers du bucket tant qu’une instance peut encore écrire.
Si l’exclusivité ne peut pas être assurée, restaurer d’abord dans un **nouveau bucket/service isolé**
puis effectuer une bascule volontaire, en tenant compte des écritures reçues depuis la sauvegarde.

## Coûts et scale à zéro

`min=0` permet à Cloud Run de s’arrêter lorsqu’il n’y a plus de trafic.
Le stockage, les images, les opérations réseau et d’autres ressources peuvent rester facturés.
Le scale à zéro ne signifie pas une facture totale nulle.
Les connexions temps réel ouvertes peuvent maintenir le service actif ; le starter n’en ouvre pas automatiquement.
