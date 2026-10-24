"use client";

import { useSyncExternalStore } from "react";

// Receipt-style timestamp, e.g. "SAT OCT 24 · 1:52 PM".
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  const now = new Date();
  const day = now
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .replaceAll(",", "");
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

// Empty on the server so the server HTML never shows a stale or wrong-timezone time.
function getServerSnapshot() {
  return "";
}

export default function LiveClock() {
  const stamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!stamp) return null;

  return (
    <time className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-faded">
      {stamp}
    </time>
  );
}
