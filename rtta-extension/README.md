# RTTA Extension

Stack:  
WXT + React + TypeScript + Tailwind

Target:  
Chrome / Manifest V3

Current product role:
Audio capture transport plus a developer/fallback translation surface. The
extension sends PCM directly to Spring; it does not relay translation events to
RTTA Web.

The offscreen document connects to `ws://localhost:8080/ws/audio` by default.
Override it at build time with `WXT_BACKEND_WS_URL`; see `.env.example`.

The popup stores the separately provisioned device token in `chrome.storage.local`.
It sends the token only in the first `AUTH` WebSocket control frame and never places
it in source, URLs, synced storage, or logs. Production CI injects only the public
`wss://api-rtta.dorriss.com/ws/audio` endpoint.

Development:

```sh
pnpm install
pnpm dev
pnpm compile
pnpm test
pnpm build
```
