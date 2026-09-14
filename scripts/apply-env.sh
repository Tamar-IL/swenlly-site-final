#!/usr/bin/env bash
# Merge KEY=value lines from a fragment file into .env, in place.
#
# Exists because the server console mangles pasted text (underscores become
# hyphens, Shift is dropped from symbols, so an API key pasted there is silently
# corrupted). Values arrive from GitHub Secrets over scp instead, byte-exact.
#
#   ./scripts/apply-env.sh /tmp/envfrag
set -euo pipefail
cd "$(dirname "$0")/.."

FRAG="${1:?usage: apply-env.sh <fragment-file>}"
[ -s "$FRAG" ] || { echo "fragment is empty — nothing to do"; exit 1; }

touch .env
cp .env ".env.bak.$(date +%Y%m%d-%H%M%S)"

# Keep only the newest backups; these accumulate on every run.
ls -1t .env.bak.* 2>/dev/null | tail -n +6 | xargs -r rm -f

changed=()
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  key="${line%%=*}"
  [ "$key" = "$line" ] && continue          # no '=', not a env line

  # Drop any existing definition, then append the new one. Two greps because a
  # key must not survive as a duplicate — the last definition would silently win.
  grep -v "^${key}=" .env > .env.tmp || true
  mv .env.tmp .env
  printf '%s\n' "$line" >> .env
  changed+=("$key")
done < "$FRAG"

chmod 600 .env
# Names only. The values are secrets and must never reach a log.
echo "updated: ${changed[*]:-none}"
