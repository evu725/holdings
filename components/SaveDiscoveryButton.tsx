"use client";
import { useState } from "react";
import Link from "next/link";
import { saveDiscovery, type SavedCompany } from "@/lib/saved-discoveries";

export default function SaveDiscoveryButton({ companies }: { companies: SavedCompany[] }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  return <div className="mt-4 font-mono text-sm">
    <button type="button" disabled={saved || !companies.length} className="rounded-sm border border-ink/30 px-5 py-3 hover:border-ink disabled:opacity-50" onClick={() => {
      try { saveDiscovery(localStorage, companies); setSaved(true); setError(""); }
      catch { setError("Could not save. Your browser may be blocking storage or it may be full."); }
    }}>{saved ? "Saved on this device ✓" : "Save on this device"}</button>
    {saved && <Link href="/saved" className="ml-4 underline">View saved</Link>}
    <p role="status" className="mt-2 text-xs text-faded">{error || "Saved only in this browser. No account needed."}</p>
  </div>;
}
