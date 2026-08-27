#!/usr/bin/env bash
# One-time HTTPS setup. Run on the server, from the repo root, after DNS points here.
#   ./scripts/init-letsencrypt.sh you@example.com
set -euo pipefail

DOMAIN=swenlly.com
EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "usage: $0 <email-for-letsencrypt-expiry-notices>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
mkdir -p nginx/active certbot/conf certbot/www

echo "==> DNS check"
resolved=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
public_ip=$(curl -fsS https://api.ipify.org || true)
echo "    $DOMAIN -> ${resolved:-unresolved} ; this server -> ${public_ip:-unknown}"
if [ -n "$resolved" ] && [ -n "$public_ip" ] && [ "$resolved" != "$public_ip" ]; then
  echo "    WARNING: they differ. Issuance will fail unless DNS points here (or Cloudflare proxy is off)."
  read -r -p "    Continue anyway? [y/N] " ok
  [ "$ok" = "y" ] || exit 1
fi

echo "==> Starting nginx on HTTP only, to answer the ACME challenge"
cp nginx/http-only.conf nginx/active/default.conf
docker compose up -d --build web nginx

echo "==> Requesting certificate for $DOMAIN and www.$DOMAIN"
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email

echo "==> Switching nginx to HTTPS"
cp nginx/https.conf nginx/active/default.conf
docker compose up -d
docker compose exec nginx nginx -s reload

echo
echo "Done. https://$DOMAIN should be live."
