#!/usr/bin/env bash
# Pull the latest code and restart the site. Run on the server, from the repo root.
#   ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# The server runs Caddy on 80/443, so `web` must join Caddy's external network — that is
# only declared in docker-compose.caddy.yml. A bare `docker compose` picks docker-compose.yml
# and strands the container on a network Caddy cannot reach, which shows up as a 502.
# For the self-contained nginx stack instead:  COMPOSE_FILE=docker-compose.yml ./scripts/deploy.sh
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.caddy.yml}"
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

echo "==> Using $COMPOSE_FILE"

echo "==> Pulling"
git pull --ff-only

echo "==> Building image"
compose build web

echo "==> Restarting"
compose up -d web

echo "==> Waiting for health"
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' swenlly-web 2>/dev/null || echo starting)
  [ "$status" = "healthy" ] && { echo "    healthy"; break; }
  [ "$i" = "30" ] && { echo "    NOT healthy — logs:"; compose logs --tail=50 web; exit 1; }
  sleep 2
done

docker image prune -f >/dev/null
echo "Deployed."
