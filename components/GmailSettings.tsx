"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import GmailPersonalization from "./GmailPersonalization";
import { saveReviewedBrands } from "@/lib/discovery-session";

export default function GmailSettings() {
  const router = useRouter();
  return <main className="min-h-screen bg-paper px-5 py-10 text-ink">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="font-mono text-sm underline">← Back to discovery</Link>
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-faded">Optional personalization</p>
        <h1 className="font-serif text-4xl">Discover brands from your Gmail receipts</h1>
        <p className="text-faded">Review your receipt brands here, then add the ones you choose to your voice or typed discovery.</p>
        <p className="text-sm text-faded">Approved brand names stay in this browser tab for up to 55 minutes. Clear them from the homepage or disconnect here at any time.</p>
      </header>
      <GmailPersonalization returnTo="/personalize" onBrandsChange={brands => {
        try { saveReviewedBrands(sessionStorage, brands); }
        catch { throw new Error("This browser is blocking session storage. Enable it to carry reviewed brands back to discovery."); }
        if (brands.length) router.push("/");
      }} />
    </div>
  </main>;
}
