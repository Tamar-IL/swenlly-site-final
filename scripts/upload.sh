#!/usr/bin/env bash
# Run this on YOUR WINDOWS MACHINE (Git Bash), from the project folder.
# Packs the committed files, uploads them, rebuilds the site on the server.
#   ./scripts/upload.sh root@SERVER_IP
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-}"
REMOTE_DIR=/root/swenlly
# Must match the compose file the server actually runs — see scripts/deploy.sh.
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.caddy.yml}"

if [ -z "$TARGET" ]; then
  echo "usage: $0 root@SERVER_IP" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes — they will NOT be uploaded."
  git status --short
  read -r -p "Commit them first? [Y/n] " ans
  if [ "${ans:-y}" != "n" ]; then
    read -r -p "Commit message: " msg
    git add -A && git commit -m "${msg:-update}"
  fi
fi

echo "==> Packing"
git archive --format=tar.gz -o swenlly-deploy.tar.gz HEAD

echo "==> Uploading to $TARGET:$REMOTE_DIR"
ssh "$TARGET" "mkdir -p $REMOTE_DIR"
scp swenlly-deploy.tar.gz "$TARGET:$REMOTE_DIR/"

echo "==> Extracting and rebuilding"
ssh "$TARGET" "cd $REMOTE_DIR \
  && tar xzf swenlly-deploy.tar.gz \
  && rm -f swenlly-deploy.tar.gz \
  && chmod +x scripts/*.sh \
  && docker compose build web \
  && docker compose up -d web"

rm -f swenlly-deploy.tar.gz
echo
echo "Done. https://swenlly.com"
