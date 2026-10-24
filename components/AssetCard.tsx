"use client";

import { useState } from "react";
import type { MatchedAsset } from "@/lib/types";

export default function AssetCard({ asset }: { asset: MatchedAsset }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-sm border border-rule bg-card p-5">
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-bold tracking-wider">
              {asset.symbol}
            </span>
            {asset.tradeable ? (
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-card">
                Tradeable
              </span>
            ) : (
              <span className="rounded-full border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-faded">
                Not tradeable yet
              </span>
            )}
          </div>
          <p className="truncate font-medium">{asset.company}</p>
          <p className="text-sm text-faded">from &ldquo;{asset.brand}&rdquo;</p>
        </div>
      </div>

      <p className="mt-4 text-sm">{asset.why}</p>

      <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
        <span className="border border-rule px-2 py-1">{asset.issuer}</span>
        <span className="border border-rule px-2 py-1">{asset.venue}</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-4 font-mono text-xs underline underline-offset-4 hover:text-faded"
      >
        {open ? "Hide details" : "View details"}
      </button>

      {open && (
        <div className="mt-3 border-t border-dashed border-rule pt-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
            <dt className="text-faded">Asset ID</dt>
            <dd className="break-all">{asset.assetId}</dd>
            <dt className="text-faded">Issuer</dt>
            <dd>{asset.issuer}</dd>
            <dt className="text-faded">Venue</dt>
            <dd>{asset.venue}</dd>
          </dl>
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-sm border border-ink/30 py-2 font-mono text-xs uppercase tracking-widest text-faded"
          >
            Trade · Demo mode
          </button>
        </div>
      )}
    </article>
  );
}
