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

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary

CRON_SECRET=

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

## 6b. If the site returns 502

Almost always caused by running a bare `docker compose` command. Without `-f`,
Compose picks `docker-compose.yml`, which starts nginx on ports 80/443 — but this
server already runs Caddy there. nginx fails to bind, and `swenlly-web` is left on
a network Caddy cannot reach, so every request 502s.

Recover with:

```bash
cd ~/swenlly
docker compose -f docker-compose.yml down   # remove the wrong stack
./scripts/deploy.sh                          # bring it back on the Caddy network
```

Confirm the container is on Caddy's network again:

```bash
docker inspect swenlly-web -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

It should print the network named in `docker-compose.caddy.yml`, not `swenlly_swenlly`.
## The meeting calendar

`/booking` and the chat agent share one calendar. Slots are 30 minutes, 11:00–17:00
and 20:00–23:00 Israel time, at least 14 hours ahead and at most two weeks out, and
never on Shabbat, a yom tov, or the day before one. Shabbat is arithmetic; the
holidays come from [Hebcal](https://www.hebcal.com/)'s public JSON API, cached for
12 hours in the container. If the container ever cannot reach `www.hebcal.com`, the
calendar falls back to blocking every Friday and Saturday and logs
`[hebcal] request failed`, which would leave chagim bookable — so it is worth a
check after a deploy:

```bash
docker compose exec web node -e "fetch('https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&i=on&start=2026-01-01&end=2026-01-31').then(r=>console.log(r.status))"
```

A meeting runs 30 minutes and is followed by a 15-minute break, so starts sit 45
minutes apart: 11:00, 11:45, 12:30 … and 20:00, 20:45, 21:30, 22:15. Nothing can
be booked inside another meeting's break, and **a day stops offering times once it
holds 4 meetings** — cancelled ones do not count, so a cancellation reopens both
the slot and the day.

Two people cannot take the same time. Checking a slot and taking it runs under a
per-day lock, so simultaneous requests queue instead of both reading "free" —
eight at once for the same slot leave exactly one booking. The lock lives in the
server process, and so does the store, so this assumes **one `web` container**,
which is what `docker-compose.yml` runs. Scaling to two would need a shared store
before it needed anything else.

Booking a meeting sends the visitor a confirmation with an `.ics` invite, and sends
`NOTIFY_EMAIL` the same details plus an AI brief on the business and search links
for reading up on its field. Both need `RESEND_API_KEY`.

## Google Meet links

Each booking creates a Google Calendar event with a Meet conference, and the link
goes into the confirmation, the reminder, the owner's copy and the `.ics`. All of
it is optional: with the variables blank a meeting is still booked and confirmed,
the email just says the call link will follow.

**Which credentials.** An OAuth **refresh token** for the Google account whose
calendar holds the meetings — not a service-account key. A service account can
only mint Meet links by impersonating a real user through domain-wide delegation,
which requires Google Workspace and an admin; a refresh token works on a plain
Gmail account and is what `swenlly` needs.

**Where they go.** Into the same `.env` on the server as everything else (step 3),
or through GitHub secrets (section 6c) as `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and `GOOGLE_CALENDAR_ID`.

**Set up, once.** In [console.cloud.google.com](https://console.cloud.google.com):

1. Create or pick a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **Publish the app.** In the current console this lives under **APIs & Services
   → OAuth consent screen**, which opens *Google Auth Platform*; then in the left
   menu click **Audience**. Under *Publishing status: Testing* press
   **PUBLISH APP** and confirm.

   Do not skip this and do not leave it in Testing. A Testing app is locked to
   accounts listed as test users, and everyone else — including the account that
   owns the project — gets turned away at sign-in with:

   > שגיאה 403: access_denied · האפליקציה נמצאת כרגע בבדיקה, ורק בודקים שאושרו
   > על ידי המפתח יכולים לגשת אליה

   And even a listed test user only gets a refresh token that **Google expires
   after 7 days**, so Meet links would be created for a week and then quietly
   stop. Publishing fixes both.

   Publishing does **not** require Google's verification review. Because
   `calendar.events` is a sensitive scope, the console warns that verification
   will be needed — push to production anyway. Unverified simply means the
   consent screen shows an "unverified app" warning and the app is capped at 100
   users, and the only person who ever signs in here is the calendar's owner. At
   that warning, click **Advanced → Go to swenllycalander (unsafe)** and carry on.

Then pick one of the two routes to the token.

### Route A — browser only, no terminal

Use this if you do not have the code checked out on your machine.

1. **Credentials → Create credentials → OAuth client ID → Web application.**
   Under *Authorised redirect URIs* add exactly:
   `https://developers.google.com/oauthplayground`
   Copy the client ID and secret.
2. Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
3. Click the **gear (⚙️)** at top right and set all four:
   - **OAuth flow:** Server-side
   - **Access type:** **Offline** — this is the one that decides whether a
     refresh token exists at all. On *Online* you get an access token that dies
     in an hour and nothing else.
   - **Force prompt consent screen:** ticked
   - **Use your own OAuth credentials:** ticked, then paste the client ID and
     secret. Without this the token belongs to Google's demo client and will not
     work with yours.
4. In **Step 1**, ignore the list and type this scope into the box at the bottom:
   `https://www.googleapis.com/auth/calendar.events`
   → **Authorize APIs** → sign in as the account that owns the calendar and
   approve (click *Advanced* → *Go to ... (unsafe)* past the unverified warning).
5. Google sends you back to **Step 2** with an **Authorization code** filled in.
   That is not the token — it is what you trade for one, it is single-use and it
   expires in minutes. Click **Exchange authorization code for tokens**.
6. The response panel now shows the **Refresh token** (it starts with `1//`).
   That is the value for `GOOGLE_REFRESH_TOKEN`.

Put it in `.env` with the client ID and secret.

If the response comes back with an access token but **no** refresh token, it is
one of two things: *Access type* was on Online, or this account already granted
this client once. Set it to Offline, tick *Force prompt consent screen*, and if it
still happens revoke the app at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) and
authorise again.

### Route B — the script

Use this if you have the repo checked out.

1. **Credentials → Create credentials → OAuth client ID → Desktop app.** Copy the
   client ID and secret. (Desktop app, not Web application — only that type
   accepts the loopback redirect the script uses.)
2. In a terminal, **change into the project folder first** — `npm run` only finds
   scripts next to `package.json`, so running it from `C:\Users\You` gives
   `Missing script: "google:token"`:

   ```
   cd path\to\swenlly-site-final
   npm install
   npm run google:token
   ```

   Run it exactly like that, with nothing before `npm`. A `VAR=value npm run ...`
   prefix is bash syntax; PowerShell reads it as a command name and answers
   `...googleusercontent.com is not recognized as the name of a cmdlet`.

3. It asks for the client ID and secret, opens your browser, and catches Google's
   redirect on `127.0.0.1` by itself — nothing to copy back. It then prints all
   four lines ready to paste into `.env`:

   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   GOOGLE_CALENDAR_ID=primary
   ```

Either route: put the values in `.env` and restart the container.

`GOOGLE_CALENDAR_ID` is `primary` for that account's own calendar; use a calendar's
ID from Google Calendar → Settings → *Integrate calendar* to book into a shared one
instead. The only scope requested is `calendar.events`, so the token cannot read
anything else in the account. A refresh token does not expire on its own, but it is
revoked if the Google password changes or access is withdrawn at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) — the
symptom is `[google] token refresh failed` in the logs and bookings arriving
without links. Re-run step 5 to fix it.

An hour before each meeting, both sides get a reminder. The server sweeps for those
every five minutes on its own, so nothing needs configuring. `/api/cron/reminders`
runs the same sweep on demand if you would rather drive it from an external cron —
set `CRON_SECRET` and send `Authorization: Bearer $CRON_SECRET`. A booking is only
ever reminded once, whoever triggers the sweep.

Without `AIRTABLE_API_KEY` the bookings live in the container's memory: fine for a
single instance, but a restart forgets them, so booked slots reopen and pending
reminders are lost. With Airtable, the `Bookings` table needs these fields:
`name`, `phone`, `email`, `business`, `businessField`, `topic`, `slot`, `slotISO`,
`locale`, `source`, `status`, `reminderSent` (checkbox), `createdAt`.

## 6c. Setting secrets without touching the server

The Hetzner web console corrupts pasted text: underscores arrive as hyphens and
Shift is dropped from symbols, so `sk-proj-Ab_c` pastes as `SK-PROJ-AB-C`. An API
key pasted there is silently wrong, and an env var named `NOTIFY-EMAIL` is
silently ignored. Typing by hand works; pasting does not.

Pasting into GitHub's browser UI works correctly, so put the value there instead
and let a workflow carry it to the server byte-exact:

1. **Settings -> Secrets and variables -> Actions -> New repository secret.**
   Name it exactly as it appears in `.env` (`OPENAI_API_KEY`, `NOTIFY_EMAIL`,
   `RESEND_API_KEY`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `TURNSTILE_SECRET`,
   `ANTHROPIC_API_KEY`, `OPENAI_MODEL`). Paste the value.
2. **Actions -> Update server environment -> Run workflow.**

It scp's the values over, merges them into `.env` (replacing any existing
definition, never duplicating a key), recreates the container so Compose re-reads
`env_file`, waits for the health check, and prints `/api/health` so you can see
what the server ended up with.

Only secrets you actually set are sent; anything left unset keeps its current
value on the server. Values never appear in the Actions log — only key names.
`LLM_PROVIDER` and `COMING_SOON` are dropdowns on the run form rather than
secrets, since neither is sensitive.

The previous `.env` is backed up on the server as `.env.bak.<timestamp>`, and the
five most recent backups are kept.

This path also works when SSH from your own machine does not — the workflow runs
from GitHub's network, not yours.

---

## 6d. Turning on Turnstile (bot protection for the forms)

The contact and booking forms verify a Cloudflare Turnstile token server-side.
Until keys are configured the check is skipped, so the only spam defence is the
honeypot field.

1. At dash.cloudflare.com -> Turnstile, add a widget for `swenlly.com`. You get a
   **site key** (public) and a **secret key** (private).
2. Add both as repository secrets, named exactly:
   - `NEXT_PUBLIC_TURNSTILE_SITEKEY`
   - `TURNSTILE_SECRET`
3. Actions -> Update server environment -> Run workflow, and **tick `rebuild`**.

Step 3's tick matters. `NEXT_PUBLIC_*` values are not read at runtime — Next.js
compiles them into the browser bundle, so the site key only takes effect after
the image is rebuilt. Recreating the container is not enough, and skipping the
rebuild leaves the widget invisible while the server starts rejecting every
submission for a missing token.

Confirm with `curl -s https://swenlly.com/api/health` — `turnstile` should be
`true` — and then submit the contact form yourself before considering it done.

To turn it off again, delete both secrets from the server's `.env` and redeploy;
`verifyTurnstile` returns true when no secret is set.

---

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

**The deploy builds fine, then fails writing the image:**

```
failed to export layer: ... failed to commit: rename
  .../ingest/<hash>/data → .../blobs/sha256/<hash>: no such file or directory
```

That reads like a corrupted content store, but it is almost always the disk
filling up during the export — containerd reports the half-written blob as
missing rather than reporting no space. Check and clear:

```bash
df -h /var/lib
docker system prune -af          # images, containers, build cache
./scripts/deploy.sh
```

`deploy.sh` now prunes dangling images before each build and refuses to start
one with under 2 GB free, so it says "reclaim space" instead of failing this
way. If the disk has room and it still happens, the content store really is
damaged: `sudo systemctl restart docker` and deploy again.

**The deploy workflow is red and the site never changes.** Check the log for:

```
error: The following untracked working tree files would be overwritten by merge:
	scripts/apply-env.sh
```

A file was created by hand on the server, and the repo later started tracking a
file of the same name; git refuses to overwrite it, so `git pull` aborts and the
container keeps running whatever it ran before. The workflow goes red but the site
stays up, so this can sit unnoticed for days. `deploy.sh` now moves such files to
`.deploy-backup/<timestamp>/` and retries on its own — but the fixed script only
runs *after* a successful pull, so the first time has to be cleared by hand:

```bash
ssh USER@SERVER
cd ~/swenlly
rm scripts/apply-env.sh     # git has the canonical copy
./scripts/deploy.sh
```

Confirm the server is on the right commit afterwards: `git -C ~/swenlly log --oneline -1`.

**`403: access_denied` when authorising Google, or Meet links that stop after a
week** — the OAuth app is in *Testing*. Publish it: **APIs & Services → OAuth
consent screen → Audience → PUBLISH APP**. See "Google Meet links" above for why
adding yourself as a test user is not the fix.

**Bookings confirmed with no Meet link** — check
`curl -s https://swenlly.com/api/health` for `"googleMeet": false` (variables
missing) and the logs for `[google] token refresh failed` (token revoked or
expired; mint a new one).

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
