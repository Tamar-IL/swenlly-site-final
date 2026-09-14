# Deploying swenlly.com to the VPS

Docker + nginx + Let's Encrypt. The site needs a real Node runtime (middleware + `/api/*`
routes), so it cannot be a static upload.

Replace `SERVER_IP` and `USER` below with your own.

---

## 0. Before you start

**Point DNS at the server.** At your domain registrar, two `A` records:

| Type | Name  | Value       |
|------|-------|-------------|
| A    | `@`   | `SERVER_IP` |
| A    | `www` | `SERVER_IP` |

Wait until `nslookup swenlly.com` returns the server IP. Certificate issuance fails otherwise.

**Push your current work.** There are uncommitted changes locally:

```bash
git add -A
git commit -m "Deploy setup: Docker, nginx, Let's Encrypt"
git push
```

---

## 1. Prepare the server (once)

SSH in:

```bash
ssh USER@SERVER_IP
```

Install Docker and open the web ports:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
exit                      # log out and back in so the docker group applies
```

---

## 2. Get the code onto the server

```bash
ssh USER@SERVER_IP
git clone https://github.com/Tamar-IL/swenlly-site-final.git swenlly
cd swenlly
```

The repo is private, so git will ask for credentials. Use a GitHub
**Personal Access Token** (github.com → Settings → Developer settings → Tokens) as the
password, not your account password.

---

## 3. Create the `.env` file on the server

```bash
nano .env
```

Paste this and fill in the real values:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8

AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=

RESEND_API_KEY=
NOTIFY_EMAIL=info@swenlly.com

TURNSTILE_SECRET=
NEXT_PUBLIC_TURNSTILE_SITEKEY=

SITE_URL=https://swenlly.com
NODE_ENV=production
```

`Ctrl+O`, `Enter`, `Ctrl+X` to save. Then lock it down:

```bash
chmod 600 .env
```

Every key is optional — the site runs without them, the forms and the agent just degrade.

> `NEXT_PUBLIC_TURNSTILE_SITEKEY` is baked in at **build** time. If you add it later,
> rebuild with `docker compose build --no-cache web`.

---

## 4. Upload the video

`public/media/portfolio-systems-16x9.mp4` is 56 MB and is deliberately kept out of git.
Run this **from your Windows machine**, in Git Bash, from the project folder:

```bash
scp -r public/media USER@SERVER_IP:~/swenlly/public/
```

---

## 5. Go live

Back on the server:

```bash
cd ~/swenlly
chmod +x scripts/*.sh
./scripts/init-letsencrypt.sh your-email@example.com
```

That script builds the image, starts nginx on HTTP, obtains the certificate for
`swenlly.com` + `www.swenlly.com`, switches nginx to HTTPS, and reloads.

Check it: **https://swenlly.com**

---

## 6. Deploying changes later

Pushing to `main` deploys automatically — see section 8. To deploy by hand:

```bash
cd ~/swenlly && ./scripts/deploy.sh
```

It pulls, rebuilds, recreates the container, and waits for the health check to pass —
printing the logs and exiting non-zero if the new build is broken.

### Changing a value in `.env`

**`docker compose restart` is not enough.** Compose reads `env_file` when it *creates* a
container, so a restart brings the old values straight back. To apply an `.env` edit:

```bash
cd ~/swenlly
docker compose -f docker-compose.caddy.yml up -d --force-recreate web
```

(`./scripts/deploy.sh` also picks up `.env` changes, because it ends in `up -d`.)

Verify the container really has the new value:

```bash
docker exec swenlly-web printenv COMING_SOON
```

Variable **names must use underscores**, never hyphens or spaces — `COMING_SOON`, not
`COMING-SOON`. A misspelled name is silently ignored, which looks exactly like the
setting having no effect.

---

## What runs where

| Container        | Role                                                       |
|------------------|------------------------------------------------------------|
| `swenlly-web`    | Next.js standalone server on port 3000, internal only      |
| `swenlly-nginx`  | Ports 80/443, TLS termination, reverse proxy, asset caching |
| `swenlly-certbot`| Renews the certificate every 12h                            |

| Path             | What it is                                                  |
|------------------|-------------------------------------------------------------|
| `nginx/https.conf` | The live nginx config — edit this, then run step 7 below   |
| `nginx/active/`  | What nginx actually reads; written by the scripts, gitignored |
| `certbot/conf/`  | Certificates. **Back this up.** Gitignored                  |
| `public/media/`  | Videos, bind-mounted into the container. Gitignored          |

## 7. Common tasks

```bash
docker compose logs -f web            # watch app logs
docker compose logs -f nginx          # watch access/error logs
docker compose restart web            # restart just the site
docker compose ps                     # what's running

# after editing nginx/https.conf:
cp nginx/https.conf nginx/active/default.conf && docker compose exec nginx nginx -s reload

# force a certificate renewal:
docker compose run --rm certbot renew --force-renewal
docker compose exec nginx nginx -s reload
```

## Troubleshooting

**502 Bad Gateway** — the app container is down or still starting.
`docker compose logs --tail=50 web`.

**Certificate issuance failed** — DNS isn't pointing here yet, or port 80 is blocked.
Verify with `curl -I http://swenlly.com/.well-known/acme-challenge/test` from outside;
you should get a 404 from nginx, not a timeout. Let's Encrypt rate-limits to 5 failures
per hour per domain, so fix DNS before retrying.

**The video doesn't play** — step 4 didn't run, or ran before the folder existed.
Check with `ls -la ~/swenlly/public/media`.

**Out of disk after several deploys** — `docker system prune -af`.


---

## 8. Automatic deploys from GitHub

`.github/workflows/deploy.yml` redeploys the site on every push to `main`. Merging a pull
request is therefore a release. It SSHes in and runs `./scripts/deploy.sh`, so the manual
path and the automatic one are the same code.

Add these under **Settings -> Secrets and variables -> Actions -> New repository secret**:

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | the server's IP or hostname |
| `DEPLOY_USER` | the SSH user that owns `~/swenlly` |
| `DEPLOY_SSH_KEY` | the **private** key, whole file including the BEGIN/END lines |
| `DEPLOY_PORT` | optional, defaults to `22` |
| `DEPLOY_KNOWN_HOSTS` | optional but recommended, see below |

Generate a key pair dedicated to deploys — do not reuse a personal key:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/swenlly_deploy -N ""
ssh-copy-id -i ~/.ssh/swenlly_deploy.pub USER@SERVER_IP
cat ~/.ssh/swenlly_deploy          # -> paste into DEPLOY_SSH_KEY
ssh-keyscan -H SERVER_IP           # -> paste into DEPLOY_KNOWN_HOSTS
```

Without `DEPLOY_KNOWN_HOSTS` the workflow accepts whatever host key it is offered on the
first connection, which is a chance for a man-in-the-middle. Setting it pins the server.

The server pulls from a private repo, so its git credentials must already be stored
(`git -C ~/swenlly pull` should succeed with no prompt). If it asks for a password, store
a PAT once with `git config --global credential.helper store` and pull manually.

Run it by hand from the **Actions** tab -> *Deploy to production* -> *Run workflow*.
