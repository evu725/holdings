import { cookies } from "next/headers";
import { GmailError, unseal } from "./gmail-core";

export const SESSION_COOKIE = "hodlings_gmail";
export const STATE_COOKIE = "hodlings_gmail_oauth";
export type GmailSession = { accessToken: string; expiresAt: number };
export type OAuthState = { state: string; verifier: string; expiresAt: number; returnTo?: "/" | "/discover" | "/personalize" };

export function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const key = process.env.GMAIL_SESSION_KEY ?? "";
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Invalid APP_ORIGIN");
  return { clientId, clientSecret, key, origin, redirectUri: `${origin}/api/gmail/callback`, configured: Boolean(clientId && clientSecret && /^[a-f0-9]{64}$/i.test(key)) };
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: gmailConfig().origin.startsWith("https:"), sameSite: "lax" as const, path: "/api/gmail", maxAge };
}
export async function gmailSession() {
  const config = gmailConfig();
  if (!config.configured) return null;
  const jar = await cookies();
  return unseal<GmailSession>(jar.get(SESSION_COOKIE)?.value, config.key, "gmail-session");
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== gmailConfig().origin) throw new GmailError("FORBIDDEN_ORIGIN", 403);
}
