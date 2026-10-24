"use client";

import { useEffect, useRef, useState } from "react";
import { discoveryText, narrationFor } from "@/lib/discovery";
import { readReviewedBrands, saveReviewedBrands } from "@/lib/discovery-session";
import type { MatchResponse } from "@/lib/types";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const DRAFT_KEY = "hodlings-voice-draft";

export default function useDiscovery() {
  const [text, setText] = useState("");
  const [emailBrands, setEmailBrands] = useState<string[]>([]);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const request = useRef<AbortController | null>(null);
  const objectUrl = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const browser = window as SpeechWindow;
    const supported = Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition);
    let restored = "";
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (typeof draft.text === "string" && draft.expiresAt > Date.now()) restored = draft.text.slice(0, 2000);
      }
    } catch { /* Storage is optional; voice and typed discovery still work. */ }
    Promise.resolve().then(() => {
      if (!active) return;
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Storage is optional. */ }
      setSpeechSupported(supported);
      if (restored) { setText(restored); setDraftRestored(true); }
      try { setEmailBrands(readReviewedBrands(sessionStorage)); } catch { /* Storage is optional. */ }
    });
    return () => {
      active = false;
      const current = recognition.current;
      if (current) { current.onstart = null; current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
      request.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function clearAudio() {
    audio.current?.pause();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = ""; setAudioUrl("");
  }
  function changeText(value: string) {
    setText(value); setResult(null); clearAudio(); setNotice("");
  }
  function changeEmailBrands(brands: string[]) {
    if (JSON.stringify(brands) === JSON.stringify(emailBrands)) return;
    setEmailBrands(brands); setResult(null); clearAudio();
    try { saveReviewedBrands(sessionStorage, brands); } catch { /* Current-page discovery still works. */ }
  }
  function startListening() {
    if (recognition.current) return;
    const browser = window as SpeechWindow;
    const SpeechRecognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!SpeechRecognition) { setNotice("Voice input is unavailable here. You can type below, or try Chrome or Edge."); return; }
    clearAudio(); setNotice(""); setResult(null);
    const session = new SpeechRecognition();
    recognition.current = session;
    session.lang = "en-US"; session.continuous = false; session.interimResults = true;
    const original = text.trim();
    let heardWords = false;
    let failed = false;
    session.onstart = () => { setListening(true); setNotice("Microphone ready. Speak your brands now."); };
    session.onresult = event => {
      const words = Array.from(event.results).map(item => item[0]?.transcript ?? "").join(" ");
      if (!words.trim()) return;
      heardWords = true;
      setNotice("");
      setText([original, words].filter(Boolean).join(" ").slice(0, 2000));
    };
    session.onerror = event => {
      failed = true;
      const errors: Record<string, string> = {
        "not-allowed": "Chrome could not access the microphone. Open the site controls beside the address bar, allow Microphone for localhost, then check Windows microphone permissions.",
        "service-not-allowed": "Chrome's speech recognition service is unavailable or blocked. Try a regular Chrome window; you can also type your brands.",
        "audio-capture": "Chrome could not capture microphone audio. Check the selected microphone in Chrome settings and Windows Sound settings, then try again.",
        "network": "Chrome could not reach its speech recognition service. Check your connection or VPN, then try again. Typed discovery still works.",
        "no-speech": "No speech was detected. Wait for Microphone ready, speak near your selected microphone, then pause.",
        "language-not-supported": "The speech service could not recognize English (US). Try typing your brands instead.",
        "aborted": "Listening was interrupted. Press the microphone to try again.",
      };
      setNotice(errors[event.error] ?? "Voice recognition stopped. Try again or type your brands below.");
    };
    session.onend = () => {
      if (recognition.current !== session) return;
      setListening(false); recognition.current = null;
      if (!failed && !heardWords) setNotice("Listening ended without a transcript. Check that the correct microphone is selected in Chrome, then try again.");
      else if (!failed) setNotice("Review what was heard, then press Enter to discover companies.");
    };
    try { setNotice("Starting microphone…"); session.start(); }
    catch { recognition.current = null; setListening(false); setNotice("Could not start voice input. Check Chrome's microphone permission and try again."); }
  }
  async function findCompanies(override?: string) {
    const input = discoveryText(override ?? text, emailBrands);
    if (!input) { setNotice("Say or type a brand first, or select brands from Gmail."); return; }
    setBusy(true); setNotice(""); setResult(null); clearAudio();
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not find companies. Please try again.");
      setResult(data);
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Discovery failed. Please try again.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function createSpeech() {
    if (!result) return;
    setBusy(true); setNotice(""); clearAudio();
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: narrationFor(result) }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) });
      if (!response.ok) {
        if (response.status === 501) throw new Error("Speech playback is not configured yet. Your results are still available below.");
        throw new Error("Could not create spoken results. Your results are still available below.");
      }
      const blob = await response.blob();
      if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("The speech service did not return audio. Please try again.");
      objectUrl.current = URL.createObjectURL(blob); setAudioUrl(objectUrl.current);
      setNotice("Your spoken summary is ready. Press play to listen.");
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Could not create audio.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function reset() {
    request.current?.abort();
    setBusy(false); setListening(false); setText(""); setEmailBrands([]);
    setResult(null); setNotice(""); setDraftRestored(false); clearAudio();
    try { saveReviewedBrands(sessionStorage, []); } catch { /* Storage is optional. */ }
  }
  function saveDraft() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ text, expiresAt: Date.now() + 600_000 })); } catch { /* Storage is optional. */ }
  }
  function attachAudio(element: HTMLAudioElement | null) { audio.current = element; }
  return { text, emailBrands, result, busy, listening, speechSupported, notice, audioUrl, draftRestored, attachAudio,
    changeText, changeEmailBrands, startListening, stopListening: () => recognition.current?.stop(),
    findCompanies, createSpeech, saveDraft, reset };
}
