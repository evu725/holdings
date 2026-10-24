import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import brands from "@/data/brands.json";
import { GMAIL_SCOPE, GmailError, googleJson, newAuthorization, scanReceiptEmails, seal, stateMatches, unseal } from "@/lib/gmail-core";
import { cookieOptions, gmailConfig, gmailSession, requireSameOrigin, SESSION_COOKIE, STATE_COOKIE, type OAuthState } from "@/lib/gmail";

type Context = { params: Promise<{ action: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
const messages: Record<string, string> = {
  NOT_CONFIGURED: "Gmail connection needs Google OAuth setup. See docs/gmail.md.",
  RECONNECT_REQUIRED: "Connect Gmail again to scan receipts.",
  FORBIDDEN_ORIGIN: "Open this page using the configured app address.",
  GOOGLE_UNAVAILABLE: "Google could not complete the request. Please try again.",
  SCAN_BUSY: "A scan is already running. Please wait.",
  SCAN_COOLDOWN: "Please wait a minute before scanning again.",
  INVALID_INPUT: "Invalid connection request.",
};
function errorResponse(error: unknown) {
  const code = error instanceof GmailError ? error.code : "GOOGLE_UNAVAILABLE";
  return json({ error: { code, message: messages[code] ?? "Request failed." } }, error instanceof GmailError ? error.status : 502);
}
// Local-demo throttle; no message content is retained. Shared hosting needs a shared limiter.
const scans = new Map<string, { at: number; busy: boolean }>();

export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  if (action === "status") {
    try { return json({ configured: gmailConfig().configured, connected: Boolean(await gmailSession()) }); }
    catch { return json({ configured: false, connected: false }); }
  }
  if (action !== "callback") return json({ error: { code: "NOT_FOUND", message: "Route not found." } }, 404);
  const config = gmailConfig();
  const jar = await cookies();
  const pending = unseal<OAuthState>(jar.get(STATE_COOKIE)?.value, config.key, "gmail-oauth");
  jar.set(STATE_COOKIE, "", cookieOptions(0));
  const url = new URL(request.url);
  const redirect = (result: string) => {
    const returnTo = pending?.returnTo === "/" ? "/" : pending?.returnTo === "/discover" ? "/discover" : "/personalize";
    const response = NextResponse.redirect(`${config.origin}${returnTo}?gmail=${result}`, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (!config.configured || !pending || !stateMatches(pending.state, url.searchParams.get("state"))) return redirect("invalid_state");
  if (url.searchParams.has("error")) return redirect("cancelled");
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096) return redirect("failed");
  try {
    const token = await googleJson("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: pending.verifier })
    }) as { access_token?: string; expires_in?: number; scope?: string };
    if (!token.access_token || !token.scope?.split(" ").includes(GMAIL_SCOPE) || !Number.isFinite(token.expires_in) || Number(token.expires_in) <= 60) return redirect("failed");
    const lifetime = Math.min(Number(token.expires_in) - 60, 3300);
    const session = seal({ accessToken: token.access_token, expiresAt: Date.now() + lifetime * 1000 }, config.key, "gmail-session");
    if (session.length > 3800) return redirect("failed");
    jar.set(SESSION_COOKIE, session, cookieOptions(lifetime));
    return redirect("connected");
  } catch { return redirect("failed"); }
}

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const { action } = await context.params;
    const config = gmailConfig();
    if (!config.configured) throw new GmailError("NOT_CONFIGURED", 503);
    const jar = await cookies();
    if (action === "connect") {
      let returnTo = "/personalize";
      if (request.headers.get("content-type")?.includes("application/json")) {
        let input: unknown;
        try { input = await request.json(); } catch { throw new GmailError("INVALID_INPUT", 400); }
        if (!input || typeof input !== "object" || !("returnTo" in input) || !["/", "/discover", "/personalize"].includes(String(input.returnTo))) throw new GmailError("INVALID_INPUT", 400);
        returnTo = String(input.returnTo);
      }
      const auth = newAuthorization(config.clientId, config.redirectUri);
      jar.set(STATE_COOKIE, seal({ state: auth.state, verifier: auth.verifier, expiresAt: auth.expiresAt, returnTo }, config.key, "gmail-oauth"), cookieOptions(600));
      return json({ authorizationUrl: auth.url });
    }
    const session = await gmailSession();
    if (action === "disconnect") {
      jar.set(SESSION_COOKIE, "", cookieOptions(0));
      jar.set(STATE_COOKIE, "", cookieOptions(0));
      let revoked = !session;
      if (session) {
        scans.delete(session.accessToken);
        try {
          const result = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: session.accessToken }), signal: AbortSignal.timeout(10_000), cache: "no-store" });
          revoked = result.ok;
        } catch { /* Local disconnect still succeeds; UI offers Google's manual removal. */ }
      }
      return json({ connected: false, revoked });
    }
    if (action !== "scan") return json({ error: { code: "NOT_FOUND", message: "Route not found." } }, 404);
    if (!session) throw new GmailError("RECONNECT_REQUIRED", 401);
    const previous = scans.get(session.accessToken);
    if (previous?.busy) throw new GmailError("SCAN_BUSY", 429);
    if (previous && Date.now() - previous.at < 60_000) throw new GmailError("SCAN_COOLDOWN", 429);
    for (const [key, value] of scans) if (!value.busy && Date.now() - value.at > 60_000) scans.delete(key);
    if (scans.size >= 1000) throw new GmailError("SCAN_BUSY", 429);
    scans.set(session.accessToken, { at: Date.now(), busy: true });
    try { return json(await scanReceiptEmails(session.accessToken, brands)); }
    finally { const current = scans.get(session.accessToken); if (current) current.busy = false; }
  } catch (error) { return errorResponse(error); }
}
