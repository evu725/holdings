"use client";

import { useEffect, useRef, useState } from "react";
import AssetCard from "./AssetCard";
import LiveClock from "./LiveClock";
import MicButton from "./MicButton";
import TickerStrip from "./TickerStrip";
import UnavailableList from "./UnavailableList";
import { MOCK_SYMBOLS, mockMatch } from "@/lib/mock";
import type { MatchResponse } from "@/lib/types";

type Phase = "idle" | "listening" | "review" | "loading" | "results";

const EXAMPLES = [
  "I play Roblox and watch Netflix",
  "I shop at Lululemon and drink Coke",
];

// The mic is mocked: it "hears" this sentence word by word. Replace with real
// recording (MediaRecorder) + /api/transcribe once the backend route exists.
const FAKE_SPEECH =
  "I play Roblox, watch Netflix, buy Lululemon, and my dad works at Coca-Cola.";

const MIC_HINTS: Record<Phase, string> = {
  idle: "Tap and tell me what you use",
  listening: "Listening… tap to stop",
  review: "Got it. Fix anything I misheard.",
  loading: "Checking the catalog…",
  results: "",
};

export default function SayItFlow() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const speechTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearSpeechTimer() {
    if (speechTimer.current) clearInterval(speechTimer.current);
    speechTimer.current = null;
  }

  useEffect(() => clearSpeechTimer, []);

  function stopListening() {
    clearSpeechTimer();
    setPhase("review");
  }

  function startListening() {
    const words = FAKE_SPEECH.split(" ");
    let count = 0;
    setTranscript("");
    setPhase("listening");
    speechTimer.current = setInterval(() => {
      count += 1;
      setTranscript(words.slice(0, count).join(" "));
      if (count >= words.length) stopListening();
    }, 220);
  }

  async function findStocks(text: string) {
    if (!text.trim()) return;
    setTranscript(text);
    setPhase("loading");
    setResult(await mockMatch(text));
    setPhase("results");
  }

  function startOver() {
    clearSpeechTimer();
    setTranscript("");
    setTyped("");
    setResult(null);
    setPhase("idle");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex w-full items-center justify-between gap-4 px-[clamp(1rem,4vw,3rem)] py-[clamp(0.75rem,2.5vh,1.5rem)]">
        <button
          type="button"
          onClick={startOver}
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
              disabled={phase === "loading"}
              onClick={phase === "listening" ? stopListening : startListening}
            />
            <p className="font-mono text-[clamp(0.8125rem,1.3vw,1rem)] text-faded" aria-live="polite">
              {MIC_HINTS[phase]}
            </p>
          </div>
        )}

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
                onChange={(e) => setTyped(e.target.value)}
                placeholder="or type it: “I watch Netflix…”"
                className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[clamp(0.8125rem,1.3vw,1rem)] placeholder:text-faded focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Find my stocks"
                className="px-2 font-mono text-lg hover:text-faded disabled:opacity-30"
                disabled={!typed.trim()}
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
          <div className="mt-10 w-full max-w-xl text-left">
            <label
              htmlFor="transcript"
              className="font-mono text-xs uppercase tracking-[0.2em] text-faded"
            >
              What I heard
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-sm border border-rule bg-card p-4 font-mono text-base focus:border-ink focus:outline-none"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => findStocks(transcript)}
                disabled={!transcript.trim()}
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
          </div>
        )}

        {phase === "loading" && (
          <div className="mt-10 w-full max-w-sm space-y-3 text-left font-mono text-xs uppercase tracking-[0.2em] text-faded">
            {["Hearing brands", "Finding parent companies", "Checking True Markets"].map(
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

            {result.available.length > 0 && (
              <section className="mt-8">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faded">
                  You can own · {result.available.length}
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

      <TickerStrip symbols={MOCK_SYMBOLS} />
    </div>
  );
}
