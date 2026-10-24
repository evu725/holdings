"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SaveDiscoveryButton from "./SaveDiscoveryButton";
import GmailFloatingButton from "./GmailFloatingButton";
import AssetCard from "./AssetCard";
import LiveClock from "./LiveClock";
import MicButton from "./MicButton";
import TickerStrip from "./TickerStrip";
import UnavailableList from "./UnavailableList";
import useDiscovery from "@/hooks/useDiscovery";
import { discoveryText } from "@/lib/discovery";
import { toFrontendMatch } from "@/lib/frontend-adapter";

type Phase = "idle" | "listening" | "review" | "loading" | "results";
const EXAMPLES = ["I play Roblox and watch Netflix", "I shop at Lululemon and use Instagram"];
const MIC_HINTS: Record<Phase, string> = {
  idle: "Tap and tell me what you use", listening: "Listening… tap to stop",
  review: "Review your brands before continuing.", loading: "Checking the catalog…", results: "",
};

export default function SayItFlow() {
  const { text: transcript, result: apiResult, emailBrands, busy, listening, speechSupported, notice, audioUrl, draftRestored, attachAudio, changeText, changeEmailBrands, startListening: beginListening, stopListening: endListening, findCompanies, createSpeech, saveDraft, reset } = useDiscovery();
  const [reviewing, setReviewing] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [catalogSource, setCatalogSource] = useState<"live" | "fallback" | "unavailable" | null>(null);
  const typed = transcript;
  const setTyped = changeText;
  const result = apiResult ? toFrontendMatch(apiResult) : null;
  const phase: Phase = listening ? "listening" : result ? "results" : busy ? "loading" : reviewing || emailBrands.length || draftRestored ? "review" : "idle";

  useEffect(() => {
    const controller = new AbortController();
    function refresh() { return fetch("/api/catalog", { signal: controller.signal, cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error("Catalog unavailable");
      return response.json();
    }).then(data => {
      setSymbols(data.assets.map((asset: { symbol: string }) => asset.symbol));
      setCatalogSource(data.source === "live" ? "live" : "fallback");
    }).catch(() => { if (!controller.signal.aborted) setCatalogSource("unavailable"); }); }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  function startListening() { setReviewing(true); beginListening(); }
  function stopListening() { endListening(); }
  function findStocks(text: string) {
    if (busy || listening) return;
    setReviewing(true);
    changeText(text);
    void findCompanies(text);
  }
  function startOver() { if (busy || listening) return; reset(); setReviewing(false); }
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex w-full items-center justify-between gap-4 px-[clamp(1rem,4vw,3rem)] py-[clamp(0.75rem,2.5vh,1.5rem)]">
        <button
          type="button"
          onClick={startOver}
          disabled={busy || listening}
          aria-label="hodlings, start over"
          className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] hover:text-faded"
        >
          hodlings
        </button>
        <LiveClock />
      </header>

      <main
        className={`mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-[clamp(1rem,4vw,3rem)] py-[2vh] text-center ${
          phase === "idle" ? "justify-center" : ""
        }`}
      >
        <h1
          className={`max-w-5xl text-balance font-serif leading-[1.05] transition-all duration-500 ${
            phase === "idle"
              ? "text-[clamp(1.75rem,min(8.5vw,7.5vh),7rem)]"
              : "text-3xl sm:text-4xl"
          }`}
        >
          You already invest your time in these companies.{" "}
          <span className="block italic">Now see which ones you can own.</span>
        </h1>

        {phase !== "results" && (
          <div className="mt-[3.5vh] flex flex-col items-center gap-[1.5vh]">
            <MicButton
              listening={phase === "listening"}
              disabled={busy || speechSupported === false}
              onClick={phase === "listening" ? stopListening : startListening}
            />
            <p className="font-mono text-[clamp(0.8125rem,1.3vw,1rem)] text-faded" aria-live="polite">
              {MIC_HINTS[phase]}
            </p>
          </div>
        )}

        {phase !== "results" && <p className="mt-3 max-w-xl font-mono text-xs text-faded">
          {speechSupported === false ? "Voice input is unavailable here. Type below or try Chrome or Edge." : "Your browser may send audio to its speech recognition provider. Listening starts only when you press the mic."}
        </p>}
        <p role="status" aria-live="polite" className="mt-4 max-w-xl font-mono text-sm">{notice}</p>

        {phase === "idle" && (
          <>
            <form
              className="mt-[3vh] flex w-full max-w-xl items-center border-b border-ink/30 focus-within:border-ink"
              onSubmit={(e) => {
                e.preventDefault();
                findStocks(typed);
              }}
            >
              <label htmlFor="typed" className="sr-only">
                Or type the brands you use
              </label>
              <input
                id="typed"
                value={typed}
                maxLength={2000}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="or type it: “I watch Netflix…”"
                className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[clamp(0.8125rem,1.3vw,1rem)] placeholder:text-faded focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Find my stocks"
                className="px-2 font-mono text-lg hover:text-faded disabled:opacity-30"
                disabled={!discoveryText(typed, emailBrands)}
              >
                →
              </button>
            </form>

            <div className="mt-[3vh] flex w-full flex-col items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-faded">
                Or try one
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => findStocks(example)}
                    className="rounded-full border border-ink/20 bg-card px-4 py-[clamp(0.375rem,1vh,0.5rem)] text-[clamp(0.8125rem,1.3vw,1rem)] hover:border-ink"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === "listening" && (
          <p className="mt-10 max-w-xl font-mono text-lg">
            {transcript}
            <span className="caret ml-0.5 inline-block h-5 w-2 translate-y-0.5 bg-ink" />
          </p>
        )}

        {phase === "review" && (
          <form className="mt-10 w-full max-w-xl text-left" onSubmit={event => {
            event.preventDefault();
            findStocks(transcript);
          }}>
            <label
              htmlFor="transcript"
              className="font-mono text-xs uppercase tracking-[0.2em] text-faded"
            >
              What I heard
            </label>
            <textarea
              id="transcript"
              value={transcript}
              maxLength={2000}
              onChange={(e) => changeText(e.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (discoveryText(transcript, emailBrands)) event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              className="mt-2 w-full resize-none rounded-sm border border-rule bg-card p-4 font-mono text-base focus:border-ink focus:outline-none"
            />
            <p className="mt-2 font-mono text-xs text-faded">Enter to discover · Shift+Enter for a new line</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!discoveryText(transcript, emailBrands)}
                className="rounded-sm bg-ink px-5 py-3 font-mono text-sm text-paper hover:bg-ink/85 disabled:opacity-40"
              >
                Find my stocks →
              </button>
              <button
                type="button"
                onClick={startListening}
                className="rounded-sm border border-ink/30 px-5 py-3 font-mono text-sm hover:border-ink"
              >
                Say it again
              </button>
            </div>
          </form>
        )}

        {phase === "loading" && (
          <div className="mt-10 w-full max-w-sm space-y-3 text-left font-mono text-xs uppercase tracking-[0.2em] text-faded">
            {["Reading your reviewed brands", "Finding parent companies", "Checking the available catalog"].map(
              (step, i) => (
                <p
                  key={step}
                  className="flex animate-pulse justify-between border-b border-dashed border-rule pb-2"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <span>{step}</span>
                  <span>…</span>
                </p>
              ),
            )}
          </div>
        )}

        {phase === "results" && result && (
          <div className="mt-10 w-full text-left">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-faded">
              You said
            </p>
            <p className="mt-1 font-mono text-sm">&ldquo;{transcript}&rdquo;</p>

            <p className="mt-6 font-serif text-3xl leading-tight" aria-live="polite">
              {result.spokenSummary}
            </p>

            <p className="mt-3 font-mono text-xs text-faded">{apiResult?.source === "grok" ? "Explanations generated with Grok." : "Matched using the curated brand catalog."}</p>
            {!!result.available.length && <SaveDiscoveryButton key={result.available.map(asset => asset.symbol).join(",")} companies={result.available} />}
            <button type="button" disabled={busy} onClick={createSpeech} className="mt-4 rounded-sm border border-ink/30 px-5 py-3 font-mono text-sm disabled:opacity-40">{busy ? "Creating audio…" : "Create spoken summary"}</button>
            {audioUrl && <audio ref={attachAudio} controls src={audioUrl} className="mt-4 w-full" aria-label="Spoken discovery summary" />}

            {result.available.length > 0 && (
              <section className="mt-8">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faded">
                  Companies to explore · {result.available.length}
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {result.available.map((asset) => (
                    <AssetCard key={asset.assetId} asset={asset} />
                  ))}
                </div>
              </section>
            )}

            <UnavailableList brands={result.unavailable} />

            <button
              type="button"
              onClick={startOver}
              className="mt-10 rounded-sm border border-ink/30 px-5 py-3 font-mono text-sm hover:border-ink"
            >
              ← Start over
            </button>
          </div>
        )}
      </main>

      <footer className="mx-auto mb-6 w-full max-w-3xl space-y-3 px-[clamp(1rem,4vw,3rem)] text-center font-mono text-xs text-faded">
        <Link href="/saved" className="inline-block underline underline-offset-4">Saved discoveries</Link>
        {!!emailBrands.length && <p>{emailBrands.length} reviewed Gmail {emailBrands.length === 1 ? "brand" : "brands"} included. <button type="button" disabled={busy || listening} onClick={() => { changeEmailBrands([]); setReviewing(true); }} className="underline disabled:opacity-40">Clear</button></p>}
        {catalogSource && <p>{catalogSource === "live" ? "● Live True Markets catalog · refreshes every 60s" : catalogSource === "fallback" ? "Saved catalog · live connection unavailable" : "Catalog connection unavailable"}</p>}
        <p>Reviewed input may be sent to Grok. Educational discovery, not investment advice.</p>
      </footer>
      <TickerStrip symbols={symbols} />
      <GmailFloatingButton disabled={busy || listening} onNavigate={saveDraft} />
    </div>
  );
}
