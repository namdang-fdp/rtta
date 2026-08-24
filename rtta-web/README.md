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

No Azure key or other provider secret belongs in this application. Only the public live WebSocket URL is exposed to the browser.

## Quality checks

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## S05 routes

- `/` — real live translation workspace with reconnect and auto-follow behavior
- `/transcript` — demo transcript foundation
- `/notes` — notes foundation and empty state
- `/context` — static research context foundation
- `/meetings/completed` — demo completed-meeting future state

Bookmark and note interactions on the Live screen are local React state only. Transcript, research context, recording, synthesis, and action-item content are explicit S05 demo surfaces with no persistence or generated backend calls.
