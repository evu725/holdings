# Integrated voice and Gmail discovery

The primary screen is now the teammate's `SayItFlow` at `/`. `/discover` renders
that same component as a compatible alternate entry point. `/personalize` retains
standalone Gmail review. The teammate's layout, fonts, colors, microphone button,
asset cards, unavailable list and clock are preserved.

## What is wired

- Real browser `SpeechRecognition`/`webkitSpeechRecognition` replaces simulated
  microphone input. Typed input remains available. Users review speech before
  submitting it; no recording starts automatically.
- `POST /api/match` receives reviewed voice/typed text plus explicitly approved
  Gmail brand names. Mock matching is no longer imported by the live screen.
- `lib/frontend-adapter.ts` adapts the backend's `matches[].asset` contract into
  the frontend's `available` card model without changing the backend response.
  IDs, issuer, venue and tradeability are taken from returned assets, not mocks.
  The API does not return an exact input brand per result, so cards do not invent
  a brand attribution; the backend explanation still describes the relationship.
- `GET /api/catalog` supplies actual symbols for the decorative ticker.
- **Create spoken summary** calls the existing `POST /api/speak` and displays an
  audio player. Missing provider configuration or failures leave results visible.
- Gmail is optional and lives on `/personalize`, opened from the floating Gmail button and its introduction dialog. The homepage never mounts the Gmail controls. Visiting the separate page checks connection status; scans
  run only on request. Users review brands and add selected names to discovery,
  then run a new match. Removing brands, rescanning or disconnecting removes
  previously applied email brands from the discovery input.

The existing backend match/catalog/speak routes and trading credentials are
unchanged. `lib/mock.ts` remains available for isolated layout work but is not
used by the live flow. Frontend presentation types live in `lib/types.frontend.ts`;
backend wire types remain in `lib/types.ts`.

## Components and controller

`components/SayItFlow.tsx` owns the teammate's visual flow.
`hooks/useDiscovery.ts` owns microphone lifecycle, transcript, reviewed email
brands, matching, speech generation, request cancellation/timeouts, and draft
restoration. `components/GmailPersonalization.tsx` is reused both inside the main
flow and on the standalone Gmail page.

To embed the product flow elsewhere:

```tsx
import SayItFlow from "@/components/SayItFlow";
export default function Page() { return <SayItFlow />; }
```

Gmail's `onBrandsChange(brands)` returns only reviewed brand names. `GmailSettings` saves them in tab-scoped storage and returns to the homepage; the discovery hook restores them.
The homepage link saves the current voice/text draft before navigation. The Gmail
page passes `returnTo="/personalize"`; only `/`, `/discover` and `/personalize` are allowed OAuth return
destinations. Google's registered callback stays `/api/gmail/callback`.
A draft is stored in sessionStorage only before OAuth, expires after 10 minutes,
and is deleted after restoration. Raw emails, results and Google credentials are
not persisted in browser storage. Only reviewed brand names and a short-lived
discovery draft are kept for navigation between pages.

## Speech setup and privacy

Browser transcription needs browser support and microphone permission; a service
may also need network access. Its provider may process audio remotely, as disclosed
before the microphone button. No raw audio is uploaded to the Hodlings backend.
See [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Speech output uses the teammate's existing `ELEVENLABS_API_KEY` and
`ELEVENLABS_VOICE_ID` settings in `.env.local`. A 501 response means these settings
are missing. Keep secrets server-side. Users choose to generate and play audio.
Audio object URLs are released when input changes, on regeneration and unmount.
Reviewed text and selected brands can go to Grok through the existing matcher;
email text never enters either the matcher or narration request. Results remain
educational company discovery, not investment suitability recommendations.

## Validation

Run `node --experimental-strip-types --test tests/*.test.mjs`, `npx tsc --noEmit`,
and `npx eslint components hooks lib app tests`. Tests cover Gmail extraction,
OAuth primitives, optional-email composition, narration bounds and conversion of
real API results to frontend cards.

Browser smoke check: type Netflix, Costco and Nike, then submit. Netflix and Costco
should show real catalog assets; Nike should be outside the current catalog.
Check View details for actual asset IDs, speech generation with and without
ElevenLabs configuration, and optional Gmail review. A real microphone test needs
user permission in a supported browser. The prior homepage mock data must not be
used as evidence of actual instrument availability.

The catalog endpoint also returns source ("live" or "fallback") and refreshSeconds. The homepage checks it every 60 seconds and labels a saved fallback explicitly. This describes live asset availability, not streaming price quotes.

Saved discoveries: results can be saved to localStorage on this device without an account. The /saved page shows up to 20 timestamped company snapshots and supports removal. Raw transcripts, email bodies, tokens and trading credentials are not stored by this feature. Clearing browser data removes saved discoveries. Availability must be checked against the current catalog.
