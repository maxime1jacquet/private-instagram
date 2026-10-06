#!/usr/bin/env bash
set -euo pipefail

die() { printf '%s\n' "$*" >&2; exit 1; }
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RELEASE_TAG="${1:-${RELEASE_TAG:-}}"
[[ "$RELEASE_TAG" =~ ^projet-(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] ||
  die "Usage: scripts/deploy.sh projet-X.Y.Z (exemple: projet-0.1.0)"

for name in GCP_PROJECT_ID GCP_REGION GCP_SERVICE GCP_ARTIFACT_REPOSITORY GCP_DATA_BUCKET GCP_RUNTIME_SERVICE_ACCOUNT; do
  [[ -n "${!name:-}" ]] || die "Variable manquante: $name (voir .env.deploy.example)"
done
for tool in git docker gcloud; do
  command -v "$tool" >/dev/null || die "Commande requise: $tool"
done

[[ "$(git rev-parse HEAD)" = "$(git rev-parse --verify "refs/tags/$RELEASE_TAG^{commit}")" ]] ||
  die "Le checkout doit correspondre au tag $RELEASE_TAG."
[[ -z "$(git status --porcelain)" ]] ||
  die "Le dépôt doit être propre avant de construire une release."

REGISTRY="$GCP_REGION-docker.pkg.dev"
IMAGE="$REGISTRY/$GCP_PROJECT_ID/$GCP_ARTIFACT_REPOSITORY/$GCP_SERVICE:$RELEASE_TAG"

gcloud auth configure-docker "$REGISTRY" --quiet
docker buildx build --platform linux/amd64 --target production --tag "$IMAGE" --push .
DIGEST="$(gcloud artifacts docker images describe "$IMAGE" \
  --project="$GCP_PROJECT_ID" --format='value(image_summary.digest)')"
[[ "$DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]] || die "Digest de l'image introuvable."

# Experimental SQLite on GCS FUSE: max=1 is NOT an exclusive writer lock.
# Mount only data: hooks, migrations and Angular must come from the image.
gcloud run deploy "$GCP_SERVICE" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --image="$REGISTRY/$GCP_PROJECT_ID/$GCP_ARTIFACT_REPOSITORY/$GCP_SERVICE@$DIGEST" \
  --service-account="$GCP_RUNTIME_SERVICE_ACCOUNT" \
  --execution-environment=gen2 \
  --port=8080 \
  --cpu=1 --memory=512Mi \
  --min=0 --max=1 --min-instances=0 --max-instances=1 \
  --concurrency=20 --timeout=300 --cpu-throttling \
  --allow-unauthenticated \
  --update-env-vars=PB_DEV=false,PB_AUTOMIGRATE=false \
  --add-volume="name=pb-data,type=cloud-storage,bucket=$GCP_DATA_BUCKET,mount-options=uid=10001;gid=10001" \
  --add-volume-mount=volume=pb-data,mount-path=/pb/pb_data \
  --startup-probe=httpGet.path=/api/health,httpGet.port=8080,periodSeconds=5,timeoutSeconds=3,failureThreshold=24 \
  --quiet

gcloud run services describe "$GCP_SERVICE" \
  --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --format='value(status.url)'
