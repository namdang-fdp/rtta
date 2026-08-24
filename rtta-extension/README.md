# RTTA Extension

Stack:  
WXT + React + TypeScript + Tailwind

Target:  
Chrome / Manifest V3

Current milestone:  
S02 - Extension to Spring Streaming

The offscreen document connects to `ws://localhost:8080/ws/audio` by default.
Override it at build time with `WXT_BACKEND_WS_URL`; see `.env.example`.

Development:

```sh
pnpm install
pnpm dev
pnpm compile
pnpm test
pnpm build
```
