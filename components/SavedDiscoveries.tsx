"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readSaved, removeSaved, type SavedDiscovery } from "@/lib/saved-discoveries";

export default function SavedDiscoveries() {
  const [items, setItems] = useState<SavedDiscovery[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.resolve().then(() => {
      try { setItems(readSaved(localStorage)); }
      catch { setItems([]); setError("Saved discoveries could not be read from this browser."); }
    });
  }, []);
  return <main className="min-h-screen bg-paper px-5 py-10 text-ink"><div className="mx-auto max-w-3xl space-y-6">
    <Link href="/" className="font-mono text-sm underline">← Back to discovery</Link>
    <h1 className="font-serif text-5xl">Your saved discoveries</h1>
    <p className="text-faded">Up to 20 recent discoveries, stored only in this browser on this device. Clearing browser data removes them.</p>
    <p className="font-mono text-xs text-faded">These are saved snapshots. Check the current catalog before acting; availability may change.</p>
    <p role="status" className="font-mono text-sm">{error}</p>
    {items === null ? <p>Loading saved discoveries…</p> : !items.length ? <p>No saved discoveries yet. Find companies, then choose “Save on this device.”</p> : items.map(item => <article key={item.id} className="rounded-sm border border-rule bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4 font-mono text-xs"><time dateTime={item.savedAt}>{new Date(item.savedAt).toLocaleString()}</time><button type="button" className="underline" onClick={() => {
        try { setItems(removeSaved(localStorage, item.id)); setError(""); }
        catch { setError("Could not remove this discovery. Please try again."); }
      }}>Remove</button></div>
      {item.companies.map((company, index) => <div key={`${company.symbol}-${index}`} className="border-t border-rule py-3"><h2 className="font-serif text-2xl">{company.company} <span className="font-mono text-sm text-faded">{company.symbol}</span></h2><p className="mt-2 text-sm">{company.why}</p></div>)}
    </article>)}
    <p className="font-mono text-xs text-faded">Educational discovery only, not investment advice.</p>
  </div></main>;
}
