#!/usr/bin/env node
/**
 * Mints the GOOGLE_REFRESH_TOKEN the booking calendar needs.
 *
 * Run it from inside a checkout of this repo — `npm run` only finds scripts in
 * the folder that holds package.json:
 *
 *   cd path/to/swenlly-site-final
 *   npm run google:token
 *
 * If you have no checkout and no terminal, DEPLOY.md documents a browser-only
 * route through Google's OAuth Playground that produces the same token.
 *
 * The flow is a loopback redirect: this script listens on 127.0.0.1, Google
 * redirects the browser back to it with the code, and it exchanges the code
 * without anyone copying anything. The old copy-the-code flow
 * (urn:ietf:wg:oauth:2.0:oob) was shut off by Google in October 2022 and now
 * fails with invalid_request, so it is not an option.
 */

import { createInterface } from "node:readline/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { stdin, stdout, platform } from "node:process";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const rl = createInterface({ input: stdin, output: stdout });

async function need(name, label) {
  const fromEnv = (process.env[name] || "").trim();
  if (fromEnv) {
    console.log(`${name}: taken from the environment.`);
    return fromEnv;
  }
  let value = "";
  while (!value) value = (await rl.question(`${label}: `)).trim();
  return value;
}

/** Opens the URL in the default browser. Best effort — the URL is printed too. */
function openBrowser(url) {
  const cmd =
    platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : platform === "darwin" ? ["open", [url]]
    : ["xdg-open", [url]];
  try {
    const child = spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true });
    // spawn reports a missing opener asynchronously, so an unhandled 'error'
    // here would take the whole script down. The printed URL is the fallback.
    child.on("error", () => {});
    child.unref();
  } catch {
    /* same fallback */
  }
}

/**
 * Listens on 127.0.0.1 for Google's redirect. Resolves as soon as the port is
 * known — the code itself arrives later, on the promise it hands back.
 */
function startCallbackServer() {
  return new Promise((resolve, reject) => {
    let gotCode, noCode;
    const code = new Promise((res, rej) => {
      gotCode = res;
      noCode = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      const received = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><meta charset="utf-8"><body dir="rtl" style="font-family:system-ui;padding:44px;text-align:center">
         <h2>${received ? "אפשר לסגור את החלון הזה" : "משהו השתבש"}</h2>
         <p>${received ? "חוזרים לטרמינל — הטוקן מודפס שם." : error || "no code"}</p></body>`
      );
      server.close();
      if (received) gotCode(received);
      else noCode(new Error(error || "Google sent no code"));
    });

    server.on("error", reject);
    // Port 0 lets the OS pick a free one. A Desktop-app client accepts any
    // loopback port without it being registered in Google Cloud.
    server.listen(0, "127.0.0.1", () => {
      resolve({ port: server.address().port, code });
    });
  });
}

console.log("\nGoogle Meet — minting a refresh token for swenlly's booking calendar.\n");
console.log("Before running this, in the Google Cloud Console:");
console.log("  • Calendar API enabled");
console.log("  • OAuth consent screen set to PUBLISHED / In production");
console.log("    (in Testing, the refresh token expires after 7 days)");
console.log("  • An OAuth client of type: Desktop app\n");

const CLIENT_ID = await need("GOOGLE_CLIENT_ID", "Paste the OAuth client ID");
const CLIENT_SECRET = await need("GOOGLE_CLIENT_SECRET", "Paste the OAuth client secret");

const { port, code: codePromise } = await startCallbackServer();
const REDIRECT = `http://127.0.0.1:${port}`;

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    // Both are required to get a refresh token back at all.
    access_type: "offline",
    prompt: "consent",
  });

console.log("\nOpening your browser. Sign in as the Google account that owns the calendar.");
console.log("If it does not open, paste this in yourself:\n");
console.log(authUrl + "\n");
console.log('An "unverified app" warning is expected — click Advanced, then continue.');
console.log("Waiting for you to approve…");
openBrowser(authUrl);

const code = await codePromise;
rl.close();

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
  }),
});

const data = await res.json();

if (!res.ok) {
  console.error("\nGoogle rejected the exchange:", JSON.stringify(data, null, 2));
  // The ones that actually happen, each with the thing to go and fix.
  if (data.error === "invalid_client") {
    console.error("\n→ The client ID or secret is wrong. Copy them again from Google Cloud\n  Console → APIs & Services → Credentials, and check for a stray space.");
  } else if (data.error === "invalid_grant") {
    console.error("\n→ The code was already used or has expired. Run this again.");
  } else if (data.error === "redirect_uri_mismatch") {
    console.error("\n→ The OAuth client is not a Desktop app. Only that type accepts a\n  loopback redirect on any port. Create one under Credentials →\n  Create credentials → OAuth client ID → Desktop app.");
  }
  process.exit(1);
}

if (!data.refresh_token) {
  console.error("\nGoogle returned an access token but no refresh token.");
  console.error("\n→ That happens when this account already granted this client. Revoke it at\n  https://myaccount.google.com/permissions and run this again.");
  process.exit(1);
}

console.log("\n" + "─".repeat(66));
console.log("Copy these four lines into the server's .env:\n");
console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}`);
console.log(`GOOGLE_CALENDAR_ID=primary`);
console.log("─".repeat(66) + "\n");
