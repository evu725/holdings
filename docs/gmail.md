# Gmail receipt discovery

Open `/personalize` on the running Next.js app. This feature is independent of
the homepage so it can be linked from the teammate-owned frontend without replacing it.
The voice-first homepage (also available at `/discover`) links here as an optional
addition to speech/typed discovery; see [voice integration](voice-integration.md).
No Express service or trading credentials are needed. `html-to-text` converts HTML
email bodies to searchable text without executing HTML or loading remote content.

## Google setup (required for a real mailbox)

1. In [Google Cloud](https://console.cloud.google.com/), create/select a project and enable **Gmail API**.
2. Configure **Google Auth Platform** branding and consent. For a hackathon, keep
   the app in testing and add the participating Gmail addresses as test users.
3. Add scope `https://www.googleapis.com/auth/gmail.readonly` under Data Access.
4. Create an OAuth client of type **Web application**. Add the exact authorized
   redirect URI `http://localhost:3000/api/gmail/callback`.
5. Add these settings to the project's `.env.local` (preserve teammates' settings):

   ```dotenv
   APP_ORIGIN=http://localhost:3000
   GOOGLE_CLIENT_ID=your-web-client-id
   GOOGLE_CLIENT_SECRET=your-web-client-secret
   GMAIL_SESSION_KEY=your-64-character-random-hex-key
   ```

   Generate the encryption key locally with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   These are server-only secrets. Never prefix them with `NEXT_PUBLIC_`, commit
   them, or paste them into chat. Restart the dev server after changing settings.
6. Visit `http://localhost:3000/personalize`, choose **Connect Gmail**, authorize
   your test account, and choose **Scan receipt emails**. Select the detected
   brands you approve and choose **Explore selected brands**.

Use the same host everywhere: `localhost` and `127.0.0.1` have different origins
and cookies. If port 3000 is occupied, stop the other dev server or update both
`APP_ORIGIN` and Google's redirect URI for the chosen port. Production requires
an HTTPS origin and matching registered callback.

Google classifies this scope as restricted. Public launch requires reviewing
Google's verification, Limited Use and any applicable security assessment
requirements. A test-user setup is not public-launch approval.
See [scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) and
[web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Data flow and boundaries

The permission Google grants is read-only access to the mailbox, **not a
receipt-only permission**. `gmail.metadata` cannot search using `q`, so the
scanner requests `gmail.readonly`. Existing connections already have the scope
needed to read message bodies; no additional Google scope is requested.
See [message search](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)
and [message retrieval](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get).

Only explicit scans run: a fixed 90-day receipt-subject query, maximum 50 unique
messages, five `format=full` message requests at a time. Both subjects and inline
plain-text/HTML MIME bodies are searched. This still searches receipt-like emails,
not the whole inbox. Body decoding is capped at 128 KiB, 100 MIME parts and 12
nesting levels per message. HTML is converted to text, with scripts, styles,
image tags and link target URLs excluded. File attachments and attached emails
are skipped; no attachment retrieval endpoints are called. Body data exposed
only through an attachment ID is not retrieved. Messages with no readable body
can still match by subject. Additional pages are not fetched; `truncated` tells
the UI there may be more. Subjects and bodies pass through server memory and are
not logged, stored, or sent to AI. Only brand names, curated parent/symbol hints
and message counts leave the scanner. A brand counts at most once per message,
even when repeated in both MIME alternatives or subject and body. Mentions may
be promotional, spoofed, forwarded, or not indicate a completed purchase.

Brand detection reuses `data/brands.json` deterministically. No AI reads email
content. Nothing is selected by default. Only after review, the UI posts the
selected brand names to the existing `/api/match` endpoint. That endpoint may use
Grok if configured; no email text is passed to it. Results are discovery matches,
not a portfolio allocation or risk/suitability recommendation. Review state and
results live only in page memory and clear on reload/disconnect. Explicitly
approved brand names can be carried back to discovery using this tab's
sessionStorage for up to 55 minutes; reset, removal or disconnect clears them.

OAuth uses random state, PKCE S256, exact configured redirect URLs, and a
ten-minute encrypted HttpOnly/SameSite=Lax state cookie. The callback validates
state and granted scope. Access tokens are encrypted with AES-256-GCM in a
separate HttpOnly cookie scoped to `/api/gmail`, Secure on HTTPS. Neither tokens
nor client secrets are exposed in API responses or browser storage. No refresh
token or offline access is requested; the connection expires in at most 55
minutes and requires reconnecting. Local disconnect clears cookies and asks
Google to revoke the active token; if revocation fails or the session already
expired, remove access through Google Account Connections. Closing the page is
not revocation. Secrets must stay stable across deployment instances; rotating
the encryption key invalidates cookies.

POSTs require the exact `Origin` header. Scans have a one-minute per-token
cooldown and single in-flight scan in this process. The local throttle is not a
shared production quota system. Before multi-user production, add application
authentication, shared quotas and audit the data-use/consent disclosures. The
short-lived encrypted cookie design intentionally avoids a token database for
this hackathon. It does not provide central session invalidation across copied
cookies. Existing matching/trading behavior is unchanged.

## Integration contract

All endpoints are same-origin, cookie-authenticated where applicable, return
`Cache-Control: no-store`, and use the Node runtime. No token is sent by frontend code.

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/gmail/status` | `{configured:boolean,connected:boolean}` |
| POST | `/api/gmail/connect` | Optional `{returnTo:"/"\|"/discover"\|"/personalize"}`; returns `{authorizationUrl:string}` |
| GET | `/api/gmail/callback` | Google-only redirect back to the allowlisted return page with `?gmail=...` |
| POST | `/api/gmail/scan` | `{signals:BrandSignal[],scannedCount:number,truncated:boolean,windowDays:90}` |
| POST | `/api/gmail/disconnect` | `{connected:false,revoked:boolean}` |

`BrandSignal` is `{brand,parent,symbol:string|null,receiptCount:number}`. The
symbol is a hint from the existing curated mappings, not an availability promise.
Errors: `{error:{code,message}}`; 401 reconnect, 403 origin mismatch, 429 scan
busy/cooldown, 503 missing configuration, 502 provider failure. No external
error details, tokens, message identifiers or subject strings are returned.

The UI calls existing `POST /api/match` with `{text: selectedBrands.join(', ')}`.
Teammates can add a link to `/personalize` without modifying their match flow.

## Verification

Run `node --experimental-strip-types --test tests/gmail.test.mjs` with Node 24+,
`npx tsc --noEmit`, and ESLint against the changed files. Unit tests use mocked
Google responses only. A real OAuth consent and mailbox scan requires your own
Google OAuth configuration and must be verified manually using the flow above.
