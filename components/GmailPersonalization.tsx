"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BrandSignal } from "@/lib/gmail-core";
import type { MatchResponse } from "@/lib/types";

type Status = { configured: boolean; connected: boolean };
type Scan = { signals: BrandSignal[]; scannedCount: number; truncated: boolean; windowDays: number };
async function api<T>(path: string, method = "POST", body?: object): Promise<T> {
  const response = await fetch(path, { method, cache: "no-store", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : data.error?.message ?? "Request failed. Please try again.");
  return data;
}
const button = "rounded-xl bg-ink px-5 py-3 font-medium text-paper disabled:opacity-50 disabled:cursor-not-allowed";

type Props = {
  onBrandsChange?: (brands: string[]) => void;
  onBeforeConnect?: () => void;
  disabled?: boolean;
  returnTo?: "/" | "/discover" | "/personalize";
};
export default function GmailPersonalization({ onBrandsChange, onBeforeConnect, disabled = false, returnTo }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResponse | null>(null);

  useEffect(() => {
    let active = true;
    api<Status>("/api/gmail/status", "GET").then(value => { if (active) setStatus(value); }).catch(() => { if (active) setNotice("Could not check Gmail connection. Refresh to try again."); });
    const result = new URLSearchParams(window.location.search).get("gmail");
    const notices: Record<string, string> = { connected: "Gmail connected. You can now scan receipt emails.", cancelled: "Connection cancelled. No scan was performed.", invalid_state: "Connection expired or could not be verified. Please connect again.", failed: "Gmail connection failed. Check the Google app configuration and try again." };
    if (result) Promise.resolve().then(() => { if (active) setNotice(notices[result] ?? ""); });
    return () => { active = false; };
  }, []);

  async function run(task: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await task(); } catch (error) { setNotice(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return (
    <div className="text-ink">
      <div className="mx-auto max-w-3xl space-y-6">
        {!onBrandsChange && <Link href="/discover" className="text-sm underline">← Discover with your voice</Link>}
        {!onBrandsChange && <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-ink">Hodlings · Your everyday brands</p>
          <h1 className="text-4xl font-semibold">Discover brands from your receipts</h1>
          <p className="text-lg text-faded">Turn familiar purchases and subscriptions into companies to explore. You choose which brands to use.</p>
        </header>}
        <section aria-labelledby="privacy" className="rounded-2xl border border-rule bg-card p-6 space-y-4">
          <h2 id="privacy" className="text-xl font-semibold">Your email, your choice</h2>
          <p>When you choose Scan receipt emails, we search the last 90 days and read the subjects and body text of up to 50 receipt, invoice, order confirmation, or subscription renewal emails. Long messages may be shortened; attachments are skipped.</p>
          <p>Google grants read-only mailbox access; it cannot limit this permission to receipts. Email text is matched locally against our existing brand list, never sent to AI or saved. Only detected brands and counts appear here.</p>
          <p>Nothing affects discovery until you review and select brands. Approved brand names may be sent to Grok by the existing discovery service. No email text is sent.</p>
          <p className="text-sm text-faded">The connection lasts up to 55 minutes. You can disconnect at any time. Closing this page does not revoke Google permission.</p>
          {!status && <p>Checking connection…</p>}
          {status && !status.configured && <p role="status" className="rounded-lg bg-amber-50 p-3">Gmail needs setup before connecting. Your developer can follow <code>docs/gmail.md</code> to add the Google app settings.</p>}
          {status?.configured && !status.connected && <button className={button} disabled={busy || disabled} onClick={() => run(async () => {
            const data = await api<{ authorizationUrl: string }>("/api/gmail/connect", "POST", { returnTo: returnTo ?? (onBrandsChange ? "/discover" : "/personalize") });
            onBeforeConnect?.();
            window.location.assign(data.authorizationUrl);
          })}>Connect Gmail</button>}
          {status?.connected && <div className="flex flex-wrap gap-3">
            <button className={button} disabled={busy || disabled} onClick={() => run(async () => {
              setScan(null); setSelected([]); setResults(null);
              onBrandsChange?.([]);
              const data = await api<Scan>("/api/gmail/scan");
              setScan(data);
            })}>{busy ? "Working…" : "Scan receipt emails"}</button>
            <button className="rounded-xl border border-rule px-5 py-3 disabled:opacity-50" disabled={busy || disabled} onClick={() => run(async () => {
              const data = await api<{ revoked: boolean }>("/api/gmail/disconnect");
              setStatus({ configured: true, connected: false }); setScan(null); setSelected([]); setResults(null);
              onBrandsChange?.([]);
              setNotice(data.revoked ? "Disconnected. Your reviewed brands have been cleared." : "Disconnected locally. Google could not confirm revocation; remove Hodlings from your Google account using the link below.");
            })}>Disconnect and clear</button>
          </div>}
          <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className="inline-block text-sm underline">Manage or remove Google account access</a>
        </section>
        <p role="status" aria-live="polite">{notice}</p>
        {scan && <section className="rounded-2xl border border-rule bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold">Review detected brands</h2>
          <p>Checked the subjects and available body text of {scan.scannedCount} receipt emails from the last {scan.windowDays} days.{scan.truncated ? " More receipts exist; this scan covers only the first 50 results." : ""}</p>
          <p className="text-sm text-faded">A mention can be mistaken or promotional. Counts represent matching messages, not verified purchases or spending.</p>
          {!scan.signals.length && <p>No brands from our current brand list were found in these receipt emails. You can still use the main brand discovery flow.</p>}
          <fieldset className="space-y-2" disabled={busy || disabled}>
            <legend className="mb-2 font-medium">Select brands to explore</legend>
            {scan.signals.map(signal => <label key={signal.brand} className="flex items-center gap-3 rounded-lg border border-rule p-3">
              <input type="checkbox" checked={selected.includes(signal.brand)} onChange={event => {
                setResults(null);
                onBrandsChange?.([]);
                setSelected(previous => event.target.checked ? [...previous, signal.brand] : previous.filter(item => item !== signal.brand));
              }} />
              <span>{signal.brand} <span className="text-sm text-faded">· {signal.receiptCount} matching {signal.receiptCount === 1 ? "message" : "messages"}</span></span>
            </label>)}
          </fieldset>
          {!!scan.signals.length && <button className={button} disabled={busy || disabled || !selected.length} onClick={() => run(async () => {
            setResults(null);
            if (onBrandsChange) {
              onBrandsChange([...selected]);
              setNotice("Selected brands added. Run discovery again above to include them.");
              return;
            }
            setResults(await api<MatchResponse>("/api/match", "POST", { text: selected.join(", ") }));
          })}>{onBrandsChange ? "Add selected brands to discovery" : "Explore selected brands"}</button>}
        </section>}
        {results && <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Companies to explore</h2>
          <p className="text-sm text-faded">Based on your selected brands. {results.source === "grok" ? "Explanations generated with Grok." : "Matched using the curated brand catalog."}</p>
          {results.matches.map(match => <article key={match.symbol} className="rounded-xl border border-rule bg-card p-5">
            <h3 className="font-semibold">{match.asset.name} · {match.symbol}</h3><p>{match.why}</p>
          </article>)}
          {!results.matches.length && <p>No matching assets are available in the current demo catalog.</p>}
          {!!results.unavailable.length && <p>Outside the current catalog: {results.unavailable.map(item => item.brand).join(", ")}.</p>}
        </section>}
        {!onBrandsChange && <footer className="text-sm text-faded">Educational discovery only. Brand familiarity and email activity do not establish investment suitability. Research the whole company and its risks before making investment decisions.</footer>}
      </div>
    </div>
  );
}
