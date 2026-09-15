#!/usr/bin/env node
/**
 * Mints the GOOGLE_REFRESH_TOKEN the booking calendar needs.
 *
 * Run it once, on your own machine, from the repo root:
 *
 *   npm run google:token
 *
 * It asks for the client id and secret from the OAuth client you created in
 * Google Cloud, prints a URL to approve as the account whose calendar holds the
 * meetings, takes the code back, and prints the refresh token. Put that token in
 * the server's .env — it does not expire on its own.
 *
 * The values can also come from the environment, but that syntax differs per
 * shell, so the prompts are the reliable path and this script prefers them.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

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

console.log("\nGoogle Meet — minting a refresh token for swenlly's booking calendar.");
console.log("Create the OAuth client first: Google Cloud Console → APIs & Services →");
console.log("Credentials → Create credentials → OAuth client ID → Desktop app.\n");

const CLIENT_ID = await need("GOOGLE_CLIENT_ID", "Paste the OAuth client ID");
const CLIENT_SECRET = await need("GOOGLE_CLIENT_SECRET", "Paste the OAuth client secret");
// The out-of-band value Google still accepts for installed-app clients. If your
// OAuth client rejects it, add http://localhost as an authorized redirect URI
// and set GOOGLE_REDIRECT_URI to match.
const REDIRECT = (process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob").trim();
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

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

console.log("\n1. Open this URL, signed in as the Google account that owns the calendar:\n");
console.log(authUrl);
console.log("\n2. Approve it. Google then shows you a code — copy that.\n");

const code = (await rl.question("Paste the code here: ")).trim();
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
  // The three that actually happen, each with the thing to go and fix.
  if (data.error === "invalid_client") {
    console.error("\n→ The client ID or secret is wrong. Copy them again from Google Cloud\n  Console → APIs & Services → Credentials, and check for a stray space.");
  } else if (data.error === "invalid_grant") {
    console.error("\n→ The code was already used or has expired. They are single-use and\n  short-lived: run this again and paste a fresh one straight away.");
  } else if (data.error === "redirect_uri_mismatch") {
    console.error("\n→ This OAuth client does not accept the out-of-band redirect. Create a\n  Desktop app client instead of a Web application one, or add\n  http://localhost as a redirect URI and set GOOGLE_REDIRECT_URI to it.");
  }
  process.exit(1);
}

if (!data.refresh_token) {
  console.error("\nGoogle returned an access token but no refresh token.");
  console.error(
    "\n→ That happens when this account already granted this client. Revoke it at\n  https://myaccount.google.com/permissions and run this again."
  );
  process.exit(1);
}

console.log("\n" + "─".repeat(64));
console.log("Copy these four lines into the server's .env:\n");
console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}`);
console.log(`GOOGLE_CALENDAR_ID=primary`);
console.log("─".repeat(64) + "\n");
