import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { compile } from "html-to-text";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const RECEIPT_QUERY = 'newer_than:90d -in:spam -in:trash {subject:receipt subject:invoice subject:"order confirmation" subject:"subscription renewal" subject:"payment received"}';
export type BrandHint = { brand: string; parent: string; symbol: string | null };
export type BrandSignal = BrandHint & { receiptCount: number };
export type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: { name?: string; value?: string }[];
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPart[];
};
export type GmailMessage = { id?: string; payload?: GmailPart };
export class GmailError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

// Authenticated encryption keeps bearer credentials unreadable to browser scripts.
// Purpose separation prevents an OAuth state cookie from being used as a session.
export function seal(value: object, keyHex: string, purpose: string): string {
  if (!/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error("Invalid Gmail encryption key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  cipher.setAAD(Buffer.from(purpose));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}
export function unseal<T extends { expiresAt: number }>(value: string | undefined, keyHex: string, purpose: string): T | null {
  try {
    if (!value || value.length > 3800 || !/^[a-f0-9]{64}$/i.test(keyHex)) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as T;
    return Number.isFinite(result.expiresAt) && result.expiresAt > Date.now() ? result : null;
  } catch { return null; }
}
export function stateMatches(expected: string, actual: string | null): boolean {
  if (!actual || actual.length > 200) return false;
  const a = Buffer.from(expected), b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function newAuthorization(clientId: string, redirectUri: string) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri,
    response_type: "code", scope: GMAIL_SCOPE, state, access_type: "online",
    prompt: "consent select_account", code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  return { url: url.toString(), state, verifier, expiresAt: Date.now() + 600_000 };
}

const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/gu, " ");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MAX_BODY_BYTES = 128 * 1024;
const htmlText = compile({
  wordwrap: false,
  limits: { maxInputLength: MAX_BODY_BYTES, maxDepth: 40, maxChildNodes: 5000 },
  selectors: [
    { selector: "a", options: { ignoreHref: true } },
    ...["img", "script", "style", "head", "iframe", "object", "svg"].map(selector => ({ selector, format: "skip" })),
  ],
});

// Decode only inline text MIME parts. Never execute HTML, load remote resources,
// retrieve attachment bodies, or return content to the browser/AI.
export function messageBodyText(payload: GmailPart | undefined): string {
  const texts: string[] = [];
  let remaining = MAX_BODY_BYTES;
  let visited = 0;
  function visit(part: GmailPart, depth: number) {
    if (depth > 12 || visited++ >= 100 || remaining <= 0) return;
    const disposition = part.headers?.find(h => h.name?.toLowerCase() === "content-disposition")?.value ?? "";
    if (part.filename || /^attachment\b/i.test(disposition)) return;
    const mime = part.mimeType?.toLowerCase();
    if (mime === "message/rfc822") return;
    if (mime === "text/plain" || mime === "text/html") {
      const data = part.body?.data;
      if (data && /^[A-Za-z0-9_\-+/]*={0,2}$/.test(data)) {
        // Limit decoding before allocating a potentially huge body buffer.
        const prefix = data.slice(0, Math.ceil(remaining / 3) * 4);
        const bytes = Buffer.from(prefix, "base64url").subarray(0, remaining);
        remaining -= bytes.length;
        const contentType = part.headers?.find(h => h.name?.toLowerCase() === "content-type")?.value ?? "";
        const charset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1] ?? "utf-8";
        let text: string;
        try { text = new TextDecoder(charset).decode(bytes); }
        catch { text = bytes.toString("utf8"); }
        texts.push(mime === "text/html" ? htmlText(text) : text);
      }
    }
    for (const child of part.parts ?? []) {
      if (visited >= 100 || remaining <= 0) break;
      visit(child, depth + 1);
    }
  }
  if (payload) visit(payload, 0);
  return texts.join("\n").slice(0, MAX_BODY_BYTES);
}

export function extractSignals(messages: GmailMessage[], hints: BrandHint[]): BrandSignal[] {
  const counts = new Map<string, BrandSignal>();
  const seen = new Set<string>();
  for (const message of messages) {
    if (!message.id || seen.has(message.id)) continue;
    seen.add(message.id);
    const subject = normalize(message.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value ?? "").slice(0, 2000);
    // Search results are hints, not proof of a purchase. Recheck receipt-like subjects.
    if (!/\b(receipt|invoice|order confirmation|subscription renewal|payment received)\b/.test(subject)) continue;
    const text = `${subject}\n${normalize(messageBodyText(message.payload))}`;
    for (const hint of hints) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(hint.brand))}(?![\\p{L}\\p{N}])`, "u");
      if (!pattern.test(text)) continue;
      const key = normalize(hint.brand);
      const existing = counts.get(key);
      if (existing) existing.receiptCount++;
      else counts.set(key, { ...hint, receiptCount: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.receiptCount - a.receiptCount || a.brand.localeCompare(b.brand));
}

export async function googleJson(url: string | URL, options: RequestInit, fetcher: typeof fetch = fetch) {
  const response = await fetcher(url, { ...options, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new GmailError(response.status === 401 ? "RECONNECT_REQUIRED" : "GOOGLE_UNAVAILABLE", response.status === 401 ? 401 : 502);
  return response.json();
}

export async function scanReceiptEmails(token: string, hints: BrandHint[], fetcher: typeof fetch = fetch) {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.search = new URLSearchParams({ q: RECEIPT_QUERY, maxResults: "50", fields: "messages/id,nextPageToken" }).toString();
  const options = { headers: { Authorization: `Bearer ${token}` } };
  const list = await googleJson(listUrl, options, fetcher) as { messages?: { id: string }[]; nextPageToken?: string };
  const ids = [...new Set((list.messages ?? []).map(item => item.id))].slice(0, 50);
  const messages: GmailMessage[] = [];
  // Five requests at a time, at most 50 receipt emails per explicit scan.
  // FULL supplies inline MIME text; attachment endpoints are never called.
  for (let i = 0; i < ids.length; i += 5) {
    const batch = await Promise.all(ids.slice(i, i + 5).map(async id => {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
      url.search = new URLSearchParams({ format: "full", fields: "id,payload" }).toString();
      return await googleJson(url, options, fetcher) as GmailMessage;
    }));
    messages.push(...batch);
  }
  return { signals: extractSignals(messages, hints), scannedCount: messages.length, truncated: Boolean(list.nextPageToken), windowDays: 90 };
}
