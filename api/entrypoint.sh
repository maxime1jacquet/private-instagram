#!/bin/sh
set -eu
if [ "${1:-serve}" = "serve" ]; then
    if [ "$#" -gt 0 ]; then shift; fi
    exec /pb/pocketbase serve \
        --http="0.0.0.0:${PORT:-8080}" \
        --dir=/pb/pb_data \
        --hooksDir=/pb/pb_hooks \
        --migrationsDir=/pb/pb_migrations \
        --publicDir=/pb/pb_public \
        --dev="${PB_DEV:-false}" \
        --automigrate="${PB_AUTOMIGRATE:-false}" \
        "$@"
fi
exec /pb/pocketbase "$@" \
    --dir=/pb/pb_data \
    --hooksDir=/pb/pb_hooks \
    --migrationsDir=/pb/pb_migrations
