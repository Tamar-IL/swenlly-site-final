#!/usr/bin/env node
/**
 * Mints the GOOGLE_REFRESH_TOKEN the booking calendar needs.
 *
 * Run it once, on your own machine, with the client id and secret from the
 * OAuth client you created in Google Cloud:
 *
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-refresh-token.mjs
 *
 * It prints a URL, you approve it in the browser as the account whose calendar
 * holds the meetings, you paste the code back, and it prints the refresh token.
 * Put that token in the server's .env — it does not expire on its own.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// The out-of-band value Google still accepts for installed-app clients. If your
// OAuth client rejects it, add http://localhost as an authorized redirect URI
// and set GOOGLE_REDIRECT_URI to match.
const REDIRECT = process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.");
  process.exit(1);
}

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

console.log("\n1. Open this URL as the Google account that owns the calendar:\n");
console.log(authUrl);
console.log("\n2. Approve, then copy the code Google shows you.\n");

const rl = createInterface({ input: stdin, output: stdout });
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
if (!res.ok || !data.refresh_token) {
  console.error("\nFailed:", JSON.stringify(data, null, 2));
  console.error(
    "\nNo refresh_token usually means the account already granted this client. " +
      "Revoke it at https://myaccount.google.com/permissions and run this again."
  );
  process.exit(1);
}

console.log("\nGOOGLE_REFRESH_TOKEN=" + data.refresh_token + "\n");
