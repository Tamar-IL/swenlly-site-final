#!/usr/bin/env bash
# Pull the latest code and restart the site. Run on the server, from the repo root.
#   ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Pulling"
git pull --ff-only

echo "==> Building image"
docker compose build web

echo "==> Restarting"
docker compose up -d web

echo "==> Waiting for health"
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' swenlly-web 2>/dev/null || echo starting)
  [ "$status" = "healthy" ] && { echo "    healthy"; break; }
  [ "$i" = "30" ] && { echo "    NOT healthy — logs:"; docker compose logs --tail=50 web; exit 1; }
  sleep 2
done

docker image prune -f >/dev/null
echo "Deployed."
