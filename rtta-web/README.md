# RTTA Web

RTTA Web is the primary English-to-Vietnamese live reading workspace for RTTA. The Chrome extension captures audio; Spring owns the translation session; this app subscribes directly to Spring at `/ws/live`.

## Local development

Requirements: Bun 1.4 or newer and the RTTA Spring service.

```bash
cp .env.example .env.local
bun install
bun run dev
```

Open <http://localhost:3000>. The default socket URL is `ws://localhost:8080/ws/live`; override it with `NEXT_PUBLIC_RTTA_LIVE_WS_URL` when needed.

No Azure, Gemini, database, or MinIO credential belongs in this application. Only the public backend HTTP and live WebSocket URLs are exposed to the browser.

## Quality checks

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Workspace routes

- `/` — live translation, bookmark, note, Explain, and recording controls
- `/transcript`, `/notes`, `/context` — the latest persisted meeting
- `/meetings/{meetingId}` — completed meeting overview and explicit summary generation
- `/meetings/{meetingId}/transcript` — persisted final transcript and search
- `/meetings/{meetingId}/notes` — timestamp-linked research notes
- `/meetings/{meetingId}/context` — private document upload and processing state

All product data comes from Spring through centralized typed REST/WebSocket clients.
The browser never connects directly to PostgreSQL, MinIO, Azure, or Gemini.
