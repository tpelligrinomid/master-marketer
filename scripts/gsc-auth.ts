/**
 * One-time OAuth2 authorization script for Google Search Console.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable "Search Console API" under APIs & Services > Library
 *   3. Create OAuth2 credentials: APIs & Services > Credentials > Create > OAuth 2.0 Client ID > Desktop app
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npx tsx scripts/gsc-auth.ts
 *
 * Flow:
 *   1. Opens browser to Google consent screen
 *   2. You sign in as production@marketersindemand.com
 *   3. Consent to "View Search Console data"
 *   4. Script captures the redirect and exchanges for tokens
 *   5. Prints GOOGLE_GSC_REFRESH_TOKEN — store in Trigger.dev env vars
 */
import "dotenv/config";
import http from "node:http";
import { execSync } from "node:child_process";

const REDIRECT_PORT = 8888;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.\n" +
      "Usage: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npx tsx scripts/gsc-auth.ts"
  );
  process.exit(1);
}

// Build the authorization URL
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\n=== Google Search Console OAuth2 Setup ===\n");
console.log("Opening browser for authorization...\n");
console.log(`If the browser doesn't open, visit:\n${authUrl.toString()}\n`);

// Open browser (cross-platform)
const platform = process.platform;
try {
  if (platform === "win32") {
    execSync(`start "" "${authUrl.toString()}"`);
  } else if (platform === "darwin") {
    execSync(`open "${authUrl.toString()}"`);
  } else {
    execSync(`xdg-open "${authUrl.toString()}"`);
  }
} catch {
  console.log("Could not open browser automatically. Please visit the URL above.\n");
}

// Start local server to capture the redirect
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h1>Authorization failed</h1><p>Error: ${error}</p><p>You can close this window.</p>`);
    console.error(`\nAuthorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h1>Missing authorization code</h1>");
    return;
  }

  // Exchange auth code for tokens
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token returned. Make sure prompt=consent is set and you haven't already authorized this app. " +
          "Revoke access at https://myaccount.google.com/permissions and try again."
      );
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h1>Authorization successful!</h1>" +
        "<p>You can close this window and return to the terminal.</p>"
    );

    console.log("\n=== Authorization Successful ===\n");
    console.log("Add these to your Trigger.dev environment variables:\n");
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_GSC_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n================================\n");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(`<h1>Token exchange failed</h1><p>${err instanceof Error ? err.message : err}</p>`);
    console.error(`\nToken exchange failed: ${err instanceof Error ? err.message : err}`);
  }

  server.close();
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Listening on http://localhost:${REDIRECT_PORT} for OAuth redirect...\n`);
});
