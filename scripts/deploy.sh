#!/usr/bin/env bash
# Pull the latest code and restart the site. Run on the server, from the repo root.
#   ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# This script updates itself with `git pull`, and bash keeps reading the running script
# from a byte offset in the file — so the first run after deploy.sh itself changes would
# execute stale (or garbled) logic. Pull first, then re-exec the freshly pulled copy once.
if [ "${DEPLOY_REEXEC:-0}" != "1" ]; then
  echo "==> Pulling"
  # A file created by hand on the server silently blocks every future deploy the
  # moment the repo starts tracking a file of the same name: git refuses to
  # overwrite it, the pull aborts, and the site sits on old code while the
  # workflow keeps going red. Move the offenders aside and carry on rather than
  # leaving the box frozen — they are kept, not deleted.
  if ! pull_output="$(git pull --ff-only 2>&1)"; then
    printf '%s\n' "$pull_output"
    blockers="$(printf '%s\n' "$pull_output" |
      sed -n '/untracked working tree files would be overwritten/,/Please move or remove them/p' |
      sed -n 's/^\t//p')"
    [ -n "$blockers" ] || exit 1

    backup=".deploy-backup/$(date +%Y%m%d-%H%M%S)"
    echo "==> These exist on the server but are now tracked in git:"
    printf '      %s\n' $blockers
    echo "==> Moving them to $backup/ and retrying the pull"
    for f in $blockers; do
      mkdir -p "$backup/$(dirname "$f")"
      mv "$f" "$backup/$f"
    done
    git pull --ff-only
  fi
  DEPLOY_REEXEC=1 exec bash "$0" "$@"
fi

# The server runs Caddy on 80/443, so `web` must join Caddy's external network — that is
# only declared in docker-compose.caddy.yml. A bare `docker compose` picks docker-compose.yml
# and strands the container on a network Caddy cannot reach, which shows up as a 502.
# For the self-contained nginx stack instead:  COMPOSE_FILE=docker-compose.yml ./scripts/deploy.sh
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.caddy.yml}"
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

echo "==> Using $COMPOSE_FILE"

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
