"use client";

import { useRef } from "react";
import Link from "next/link";

export default function GmailFloatingButton({ disabled, onNavigate }: { disabled: boolean; onNavigate: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" disabled={disabled} onClick={() => dialog.current?.showModal()}
      aria-haspopup="dialog" aria-controls="gmail-introduction"
      className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full border border-rule bg-ink px-5 py-3 font-mono text-sm text-paper shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-40 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:hover:-translate-y-[55%]">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg>
      Gmail +
    </button>
    <dialog ref={dialog} id="gmail-introduction" aria-labelledby="gmail-intro-title"
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      className="fixed left-auto right-4 top-1/2 m-0 w-[min(24rem,calc(100vw-2rem))] -translate-y-1/2 rounded-sm border border-rule bg-card p-6 text-ink shadow-xl backdrop:bg-black/40">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faded">More personal. Still your choice.</p>
        <button type="button" autoFocus aria-label="Close Gmail introduction" onClick={() => dialog.current?.close()} className="px-2 py-1 font-mono text-xl hover:text-faded">×</button>
      </div>
      <h2 id="gmail-intro-title" className="mt-5 font-serif text-4xl leading-tight">Let your receipts tell us more.</h2>
      <p className="mt-4 text-sm leading-relaxed">Find familiar brands in your Gmail receipts and subscriptions. Review what we find, then add only the brands you choose to your discovery.</p>
      <p className="mt-4 font-mono text-xs leading-relaxed text-faded">Optional, read-only access. Your email content stays out of AI prompts. Nothing is scanned from this pop-up.</p>
      <Link href="/personalize" onClick={() => { onNavigate(); dialog.current?.close(); }} className="mt-6 block rounded-sm bg-ink px-5 py-3 text-center font-mono text-sm text-paper hover:opacity-85">Explore Gmail personalization →</Link>
      <button type="button" onClick={() => dialog.current?.close()} className="mt-4 w-full font-mono text-xs text-faded underline underline-offset-4">Keep discovering with my voice</button>
    </dialog>
  </>;
}
