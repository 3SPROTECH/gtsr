#!/usr/bin/env bash
# Deploy script — à lancer sur le VPS dans /var/www/gtsr
# Usage : ./deploy.sh
# Détecte automatiquement les changements (frontend, backend, dépendances, schéma Prisma)
# et n'exécute que les étapes nécessaires.

set -euo pipefail

cd "$(dirname "$0")"
echo "==> Branche actuelle : $(git rev-parse --abbrev-ref HEAD)"
echo "==> Commit avant pull : $(git rev-parse --short HEAD)"

# Récupère les changements
git fetch --quiet origin
CHANGED=$(git diff --name-only HEAD origin/main || true)

if [ -z "$CHANGED" ]; then
  echo "==> Déjà à jour, rien à faire."
  exit 0
fi

echo "==> Fichiers modifiés :"
echo "$CHANGED" | sed 's/^/    /'

git pull --ff-only origin main
echo "==> Commit après pull : $(git rev-parse --short HEAD)"

NEEDS_BACKEND_INSTALL=false
NEEDS_PRISMA=false
NEEDS_BACKEND_RESTART=false
NEEDS_FRONTEND_BUILD=false
NEEDS_FRONTEND_INSTALL=false

echo "$CHANGED" | grep -q '^backend/package.*\.json$'  && NEEDS_BACKEND_INSTALL=true || true
echo "$CHANGED" | grep -q '^backend/prisma/schema.prisma$' && NEEDS_PRISMA=true || true
echo "$CHANGED" | grep -q '^backend/' && NEEDS_BACKEND_RESTART=true || true
echo "$CHANGED" | grep -q '^frontend/package.*\.json$' && NEEDS_FRONTEND_INSTALL=true || true
echo "$CHANGED" | grep -q '^frontend/' && NEEDS_FRONTEND_BUILD=true || true

if [ "$NEEDS_BACKEND_INSTALL" = true ]; then
  echo "==> npm install (backend)"
  (cd backend && npm install)
fi

if [ "$NEEDS_PRISMA" = true ]; then
  echo "==> prisma generate + db push"
  (cd backend && npx prisma generate && npx prisma db push)
fi

if [ "$NEEDS_FRONTEND_INSTALL" = true ]; then
  echo "==> npm install (frontend)"
  (cd frontend && npm install)
fi

if [ "$NEEDS_FRONTEND_BUILD" = true ]; then
  echo "==> vite build"
  (cd frontend && npm run build)
fi

if [ "$NEEDS_BACKEND_RESTART" = true ]; then
  echo "==> restart gtsr-api"
  systemctl restart gtsr-api
  sleep 2
  systemctl is-active gtsr-api
fi

echo "==> Deploy terminé."
